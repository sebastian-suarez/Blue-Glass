#!/usr/bin/env python3
"""Rebuild this folder from a fresh download of the Blue Glass design system artifact.

Usage (from this folder):
    python3 -I tools/build_reference.py <artifact>/project .
    node tools/build-tokens.mjs

<artifact>/project is the artifact's project/ folder: README.md, tokens.json, design-system.json
and components/ (per-component README.md and preview.html, src/, bundle.css, index.d.ts).
The script only reads it. It rewrites the generated paths in GENERATED and leaves everything
else (README.md, tools/, tokens/tokens.css) alone.
"""
import pathlib
import re
import shutil
import sys

SECTIONS = {"ClientWork", "ContactSlab", "Hero", "ProjectCard", "SiteHeader"}
SKIP_DIRS = {"Cover", "src", "lib"}
GENERATED = ["brand-book.md", "foundation.css", "components", "sections", "shared", "source", "tokens/tokens.json"]
# Components whose look lives in a shared stylesheet rather than a section of their own.
POINTERS = {
    "BarChart": "BarChart has no section of its own: its rules are the shared chart chrome in ../../shared/charts-chrome.css.",
    "Backdrop": "Backdrop is styled by .gl-backdrop in ../../foundation.css (Overlay layers).",
    "Modal": "Modal is styled by .gl-modal and .gl-backdrop in ../../foundation.css (Overlay layers).",
    "Popover": "Popover is the shared popover surface: .gl-popover in ../../foundation.css.",
    "Popper": "Popper has no look; floating surfaces use .gl-popover in ../../foundation.css.",
}


def section_key(heading: str) -> str:
    h = heading.strip()
    if h.startswith(("Blue Glass", "Defaults for", "The site's base layer", "Glass material")):
        return "foundation"
    if h.startswith("Chart chrome"):
        return "shared:charts-chrome"
    if h.startswith("MermaidDiagram"):
        return "Mermaid"
    match = re.match(r"([A-Za-z]+)", h)
    return match.group(1) if match else "unknown"


def split_css(css: str):
    lines = css.split("\n")
    starts = [i for i, line in enumerate(lines) if line.startswith("@layer")]
    out = []
    for k, start in enumerate(starts):
        end = starts[k + 1] if k + 1 < len(starts) else len(lines)
        heading = ""
        for j in range(max(0, start - 2), min(end, start + 4)):
            m = re.match(r"\s*/\*\s*(.+?)(\*/|$)", lines[j])
            if m:
                heading = m.group(1)
                break
        out.append((section_key(heading), "\n".join(lines[start:end]).rstrip() + "\n"))
    # The file's opening comment sits above the first @layer: keep it with the foundation.
    head = "\n".join(lines[: starts[0]]).strip()
    return head, out


def split_dts(dts: str):
    sections, current, buf = {}, None, []
    header = []
    for line in dts.split("\n"):
        m = re.match(r"^// ([a-z-]+/[A-Za-z_-]+)$", line)
        if m:
            if current:
                sections[current] = "\n".join(buf).rstrip() + "\n"
            current, buf = m.group(1), [line]
        elif current is None:
            header.append(line)
        else:
            buf.append(line)
    if current:
        sections[current] = "\n".join(buf).rstrip() + "\n"
    return "\n".join(header).strip() + "\n", sections


def classes_in(text: str):
    return {c.rstrip("-") for c in re.findall(r"(?<![-\w])gl-[a-z0-9-]+", text) if c.rstrip("-") != "gl"}


def main(src_dir: str, out_dir: str) -> None:
    src = pathlib.Path(src_dir)
    out = pathlib.Path(out_dir)
    comp_root = src / "components"
    css_head, css_sections = split_css((comp_root / "bundle.css").read_text())
    dts_header, dts_sections = split_dts((comp_root / "index.d.ts").read_text())
    modules = {
        p.stem: p
        for p in (comp_root / "src").rglob("*.ts*")
        if not p.stem.startswith("_") and "internal" not in p.parts
    }

    # Reset only what this script generates.
    out.mkdir(parents=True, exist_ok=True)
    for rel in GENERATED:
        target = out / rel
        if target.is_dir():
            shutil.rmtree(target)
        elif target.exists():
            target.unlink()
    (out / "tokens").mkdir(exist_ok=True)
    shutil.copy(src / "tokens.json", out / "tokens" / "tokens.json")
    source = out / "source"
    source.mkdir()
    for name in ("bundle.css", "index.d.ts"):
        shutil.copy(comp_root / name, source / name)
    if (src / "design-system.json").exists():
        shutil.copy(src / "design-system.json", source / "design-system.json")

    (out / "brand-book.md").write_text((src / "README.md").read_text())
    foundation = [css_head + "\n"] + [text for key, text in css_sections if key == "foundation"]
    (out / "foundation.css").write_text("\n".join(foundation))

    shared = out / "shared"
    shared.mkdir()
    for p in sorted((comp_root / "src").rglob("*.ts*")):
        if p.stem.startswith("_") or "internal" in p.parts:
            shutil.copy(p, shared / p.name)
    (shared / "charts-chrome.css").write_text("".join(t for k, t in css_sections if k == "shared:charts-chrome"))

    # Which section defines each class, for the "also styled by" pointers.
    owner = {}
    for key, text in css_sections:
        for cls in re.findall(r"\.(gl-[a-z0-9-]+)", text):
            owner.setdefault(cls, set()).add(key)

    names = sorted(
        p.name
        for p in comp_root.iterdir()
        if p.is_dir() and p.name not in SKIP_DIRS and ((p / "README.md").exists() or (p / "preview.html").exists())
    )
    report = []
    for name in names:
        is_section = name in SECTIONS
        dest = out / ("sections" if is_section else "components") / name
        dest.mkdir(parents=True)
        for f in ("README.md", "preview.html"):
            if (comp_root / name / f).exists():
                shutil.copy(comp_root / name / f, dest / f)
        if is_section:
            continue
        module = modules.get(name)
        if module is None:
            report.append(f"{name}: no source module")
            continue
        source = module.read_text()
        (dest / "reference.tsx").write_text(source)
        mod_path = f"{module.parent.name}/{module.stem}"
        api = dts_sections.get(mod_path)
        (dest / "api.d.ts").write_text(dts_header + "\n" + api if api else f"// No types section for {mod_path}\n")

        own = "".join(t for k, t in css_sections if k == name)
        used = classes_in(source)
        elsewhere = {}
        for cls in sorted(used):
            for key in owner.get(cls, set()):
                if key != name:
                    elsewhere.setdefault(key, set()).add(cls)
        missing = sorted(c for c in used if c not in owner and not any(o.startswith(c + "-") for o in owner))
        lines = [f"/* {name}: reference styles, copied from the design system's bundle.css. */"]
        if name in POINTERS:
            lines.append(f"/* {POINTERS[name]} */")
        for key, cls in sorted(elsewhere.items()):
            where = {"foundation": "../../foundation.css", "shared:charts-chrome": "../../shared/charts-chrome.css"}.get(key, f"../{key}/styles.css")
            lines.append(f"/* Also styled by {where}: {', '.join(sorted(cls))} */")
        if not own and name not in POINTERS:
            lines.append("/* No section of its own in bundle.css: the reference styles it inline or through the files above. */")
        (dest / "styles.css").write_text("\n".join(lines) + "\n\n" + own)
        if missing:
            report.append(f"{name}: classes used but defined nowhere (set at runtime or unused): {', '.join(missing)}")

    print(f"reference: {len(names) - len(SECTIONS)} components, {len(SECTIONS)} sections -> {out}")
    for line in report:
        print("  note:", line)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])

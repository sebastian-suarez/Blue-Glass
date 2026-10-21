import * as React from 'react';
import { cx } from '../internal/cx';
import { Icon } from './Icon';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';
export type AvatarVariant = 'circle' | 'tile';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Image URL. While it loads the orb shows through; if it fails, the avatar falls back to children, then initials from alt, then the user glyph. */
  src?: string;
  /** Responsive image candidates, as on <img>. */
  srcSet?: string;
  /** Sizes for srcSet, as on <img>. */
  sizes?: string;
  /** The person's or the company's name: the image's alt text, the source of the initials, and the name read for a lettered avatar. */
  alt?: string;
  /** circle: initials on the site's orb gradient (default). tile: the monogram glass tile (.signature). */
  variant?: AvatarVariant;
  /** xs 24px · sm 32px · md 40px, the signature tile's size (default) · lg 56px. */
  size?: AvatarSize;
  /** Which of the site's three orbs the circle uses (.tab-orb, .orb-1, .orb-2). Default: picked from alt, so a name always gets the same orb. */
  orb?: 0 | 1 | 2;
  /** Extra attributes for the <img>, e.g. loading="lazy" or referrerPolicy. */
  imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
  /** Render as another element. Default span, so an avatar can sit inside a button or a chip. */
  component?: React.ElementType;
  /** Initials or an icon, shown when there is no image. */
  children?: React.ReactNode;
}

interface GroupContextValue {
  size?: AvatarSize;
  variant?: AvatarVariant;
}
const AvatarGroupContext = React.createContext<GroupContextValue | null>(null);

type ImageStatus = 'none' | 'loading' | 'loaded' | 'error';

/** Load the image off-DOM first, so a broken URL never paints a broken-image glyph. */
function useImageStatus(src?: string, srcSet?: string): [ImageStatus, () => void] {
  const [status, setStatus] = React.useState<ImageStatus>(src || srcSet ? 'loading' : 'none');
  React.useEffect(() => {
    if (!src && !srcSet) {
      setStatus('none');
      return undefined;
    }
    let active = true;
    setStatus('loading');
    const probe = new Image();
    probe.onload = () => {
      if (active) setStatus('loaded');
    };
    probe.onerror = () => {
      if (active) setStatus('error');
    };
    if (srcSet) probe.srcset = srcSet;
    if (src) probe.src = src;
    return () => {
      active = false;
    };
  }, [src, srcSet]);
  const fail = React.useCallback(() => setStatus('error'), []);
  return [status, fail];
}

/** First letters of the first and last words: "Sebastian Suarez" → "SS", "EPAM" → "E". */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const first = Array.from(words[0])[0] ?? '';
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] ?? '' : '';
  return (first + last).toUpperCase();
}

function orbFor(name: string): 0 | 1 | 2 {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h + name.charCodeAt(i)) % 3;
  return h as 0 | 1 | 2;
}

/** A person or a company: initials on one of the site's orbs, the monogram glass tile, or a photo. */
export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { src, srcSet, sizes, alt, variant: variantProp, size: sizeProp, orb, imgProps, component: Component = 'span', className, children, ...rest },
  ref,
) {
  const group = React.useContext(AvatarGroupContext);
  const variant = variantProp ?? group?.variant ?? 'circle';
  const size = sizeProp ?? group?.size ?? 'md';
  const [status, fail] = useImageStatus(src, srcSet);
  const showImage = status === 'loading' || status === 'loaded';
  const hasChildren = children != null && children !== false && children !== '';
  const initials = alt ? initialsOf(alt) : '';

  let content: React.ReactNode;
  if (showImage) {
    content = (
      <img
        className="gl-avatar-img"
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt ?? ''}
        {...imgProps}
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
          fail();
          (imgProps?.onError as ((ev: React.SyntheticEvent<HTMLImageElement>) => void) | undefined)?.(e);
        }}
      />
    );
  } else if (hasChildren) content = children;
  else if (initials) content = initials;
  else content = <Icon name="user" className="gl-avatar-fallback" />;

  const orbIndex = orb ?? orbFor(alt ?? (typeof children === 'string' ? children : ''));
  // Lowercase letters on a tile are a monogram, set like the header's "ss" (.signature); capitals are initials.
  const monogram = variant === 'tile' && !showImage && typeof content === 'string' && /^\p{Ll}{1,3}$/u.test(content);
  // A lettered avatar with a name reads as one image named after the person, not as "S S".
  const named = !showImage && !!alt;
  return (
    <Component
      ref={ref}
      role={named ? 'img' : undefined}
      aria-label={named ? alt : undefined}
      className={cx(
        'gl-avatar',
        `gl-avatar-${variant}`,
        size !== 'md' && `gl-avatar-${size}`,
        variant === 'circle' && orbIndex > 0 && `gl-avatar-orb-${orbIndex}`,
        monogram && 'gl-avatar-monogram',
        showImage && 'gl-avatar-has-img',
        className,
      )}
      {...rest}
    >
      {content}
    </Component>
  );
});

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Most avatars shown, counting the "+N" one. Default 5. */
  max?: number;
  /** The real total when you pass only some of the avatars; the "+N" counts from it. */
  total?: number;
  /** Size of every avatar in the group (an avatar's own size wins). */
  size?: AvatarSize;
  /** Shape of every avatar in the group (an avatar's own variant wins). */
  variant?: AvatarVariant;
  /** Overlap: md, a fifth of the avatar (default), or sm, tighter. */
  spacing?: 'md' | 'sm';
  /** Render the surplus yourself, e.g. a link to the full list. */
  renderSurplus?: (surplus: number) => React.ReactNode;
  /** Render as another element. Default div. */
  component?: React.ElementType;
  children?: React.ReactNode;
}

/** A row of overlapping avatars, each cut out of the canvas by a 2px ring, with the rest counted as "+N". */
export const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(function AvatarGroup(
  { max = 5, total, size, variant, spacing = 'md', renderSurplus, component: Component = 'div', className, children, ...rest },
  ref,
) {
  const items = React.Children.toArray(children).filter((c) => React.isValidElement(c)) as Array<React.ReactElement<{ style?: React.CSSProperties }>>;
  // MUI's arithmetic: never replace a single avatar with "+1".
  let clampedMax = max < 2 ? 2 : max;
  const totalCount = total ?? items.length;
  if (totalCount === clampedMax) clampedMax += 1;
  clampedMax = Math.min(totalCount + 1, clampedMax);
  const shown = Math.min(items.length, clampedMax - 1);
  const surplus = Math.max(totalCount - clampedMax, totalCount - shown, 0);
  const context = React.useMemo(() => ({ size, variant }), [size, variant]);

  return (
    <AvatarGroupContext.Provider value={context}>
      <Component ref={ref} role="group" className={cx('gl-avatar-group', spacing === 'sm' && 'gl-avatar-group-sm', className)} {...rest}>
        {items.slice(0, shown).map((child, i) =>
          // The first avatar sits on top; reading order stays first to last.
          React.cloneElement(child, { style: { ...(child.props.style || {}), zIndex: shown - i + 1 } }),
        )}
        {surplus > 0
          ? renderSurplus
            ? renderSurplus(surplus)
            : (
              // On top of the last avatar, so the count is never covered.
              <Avatar className="gl-avatar-surplus" style={{ zIndex: shown + 2 }}>
                <span aria-hidden="true">+{surplus}</span>
                <span className="gl-sr-only">{`${surplus} more`}</span>
              </Avatar>
            )
          : null}
      </Component>
    </AvatarGroupContext.Provider>
  );
});

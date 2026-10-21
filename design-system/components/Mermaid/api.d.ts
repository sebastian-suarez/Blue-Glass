// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// charts/Mermaid
/** A Mermaid config object (pass it to mermaid.initialize). */
export interface MermaidThemeConfig {
    theme: 'base';
    fontFamily: string;
    /** Mermaid's sequence diagrams measure every text at this size. */
    fontSize: number;
    /** Off, so labels break only where the source says `<br>`, as Diagram's do. */
    markdownAutoWrap: boolean;
    themeVariables: Record<string, string>;
    /** CSS Mermaid scopes under each diagram's id. The first rules size labels as Diagram sets them, so the layout fits its type. */
    themeCSS: string;
    flowchart: Record<string, unknown>;
    sequence: Record<string, unknown>;
}
/**
 * Blue Glass for Mermaid. The spacing and the label CSS make Mermaid lay boxes out at Diagram's
 * sizes: 15px node text on 20px lines with 16 units above and below (72-unit boxes for two lines),
 * 20 a side, 13px labels. MermaidDiagram then redraws flowcharts, state and sequence diagrams with
 * Diagram's marks. The theme variables (token values, as Mermaid does colour maths on literals)
 * dress every other diagram type, which Mermaid still draws itself.
 */
export declare const mermaidTheme: MermaidThemeConfig;
export interface MermaidDiagramProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
    /** Class names for the root element, merged with the component's own. */
    className?: string;
    /** Inline styles for the root element. */
    style?: React.CSSProperties;
    /** The Mermaid source. Add `accTitle:` and `accDescr:` lines so the drawing is named and described. */
    chart: string;
    /** Accessible name for the drawing. Use it when the source has no accTitle. */
    title?: string;
    /** Mermaid config over mermaidTheme for this diagram: objects merge one level deep, themeCSS appends. */
    config?: Record<string, unknown>;
    /** Where Mermaid is loaded from, once per page. Default: jsDelivr, mermaid@11.16.1. */
    src?: string;
    /** Floor for the scale, as Diagram's: below this share of its drawn width the diagram scrolls sideways instead. */
    minScale?: number;
    /** Redraw flowcharts, state and sequence diagrams with Diagram's marks. Default true; false keeps Mermaid's own drawing, themed. */
    restyle?: boolean;
    /** Play Diagram's entrance when the drawing scrolls into view. Default true. */
    reveal?: boolean;
    /** Run a pulse along every accent edge (`==>`) while on screen. Default true; never under reduced motion. */
    pulses?: boolean;
}
/**
 * A Mermaid diagram drawn like Diagram. Mermaid loads once, on demand, and lays the diagram out;
 * flowcharts, state and sequence diagrams are then redrawn with Diagram's own marks (glass boxes,
 * right-angled edges, arrowheads, labels beside the lines, regions, the entrance and the pulses).
 * Other diagram types keep Mermaid's drawing in the theme. The source shows as a code block until
 * it draws, or if it can't.
 */
export declare const MermaidDiagram: React.ForwardRefExoticComponent<MermaidDiagramProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

declare global {
  interface Window {
    BlueGlass: {
      Autocomplete: typeof Autocomplete;
      Button: typeof Button;
      ButtonGroup: typeof ButtonGroup;
      Checkbox: typeof Checkbox;
      Fab: typeof Fab;
      RadioGroup: typeof RadioGroup;
      Radio: typeof Radio;
      Rating: typeof Rating;
      Select: typeof Select;
      Option: typeof Option;
      Slider: typeof Slider;
      Switch: typeof Switch;
      TextField: typeof TextField;
      InputAdornment: typeof InputAdornment;
      TransferList: typeof TransferList;
      ToggleButton: typeof ToggleButton;
      ToggleButtonGroup: typeof ToggleButtonGroup;
      Avatar: typeof Avatar;
      AvatarGroup: typeof AvatarGroup;
      Badge: typeof Badge;
      Chip: typeof Chip;
      Divider: typeof Divider;
      Icon: typeof Icon;
      SvgIcon: typeof SvgIcon;
      iconNames: typeof iconNames;
      List: typeof List;
      ListItem: typeof ListItem;
      ListItemButton: typeof ListItemButton;
      ListItemIcon: typeof ListItemIcon;
      ListItemText: typeof ListItemText;
      ListSubheader: typeof ListSubheader;
      Table: typeof Table;
      TableContainer: typeof TableContainer;
      TableHead: typeof TableHead;
      TableBody: typeof TableBody;
      TableRow: typeof TableRow;
      TableCell: typeof TableCell;
      TableSortLabel: typeof TableSortLabel;
      Tooltip: typeof Tooltip;
      Typography: typeof Typography;
      Alert: typeof Alert;
      AlertTitle: typeof AlertTitle;
      Backdrop: typeof Backdrop;
      Dialog: typeof Dialog;
      DialogTitle: typeof DialogTitle;
      DialogContent: typeof DialogContent;
      DialogContentText: typeof DialogContentText;
      DialogActions: typeof DialogActions;
      LinearProgress: typeof LinearProgress;
      CircularProgress: typeof CircularProgress;
      Skeleton: typeof Skeleton;
      Snackbar: typeof Snackbar;
      Accordion: typeof Accordion;
      AccordionSummary: typeof AccordionSummary;
      AccordionDetails: typeof AccordionDetails;
      PaneAccordion: typeof PaneAccordion;
      AppBar: typeof AppBar;
      Toolbar: typeof Toolbar;
      Card: typeof Card;
      CardHeader: typeof CardHeader;
      CardContent: typeof CardContent;
      CardActions: typeof CardActions;
      CardMedia: typeof CardMedia;
      CardActionArea: typeof CardActionArea;
      Paper: typeof Paper;
      LightField: typeof LightField;
      BottomNavigation: typeof BottomNavigation;
      BottomNavigationAction: typeof BottomNavigationAction;
      Breadcrumbs: typeof Breadcrumbs;
      Drawer: typeof Drawer;
      Link: typeof Link;
      Menu: typeof Menu;
      MenuItem: typeof MenuItem;
      MenuList: typeof MenuList;
      Pagination: typeof Pagination;
      PaginationItem: typeof PaginationItem;
      SpeedDial: typeof SpeedDial;
      SpeedDialAction: typeof SpeedDialAction;
      SpeedDialIcon: typeof SpeedDialIcon;
      Stepper: typeof Stepper;
      Step: typeof Step;
      StepLabel: typeof StepLabel;
      StepContent: typeof StepContent;
      MobileStepper: typeof MobileStepper;
      Tabs: typeof Tabs;
      Tab: typeof Tab;
      TabPanel: typeof TabPanel;
      Box: typeof Box;
      Container: typeof Container;
      Grid: typeof Grid;
      Stack: typeof Stack;
      ImageList: typeof ImageList;
      ImageListItem: typeof ImageListItem;
      ImageListItemBar: typeof ImageListItemBar;
      Masonry: typeof Masonry;
      Timeline: typeof Timeline;
      TimelineItem: typeof TimelineItem;
      TimelineSeparator: typeof TimelineSeparator;
      TimelineDot: typeof TimelineDot;
      TimelineConnector: typeof TimelineConnector;
      TimelineContent: typeof TimelineContent;
      TimelineOppositeContent: typeof TimelineOppositeContent;
      ClickAwayListener: typeof ClickAwayListener;
      CssBaseline: typeof CssBaseline;
      Modal: typeof Modal;
      NoSsr: typeof NoSsr;
      Popover: typeof Popover;
      Popper: typeof Popper;
      computePosition: typeof computePosition;
      Portal: typeof Portal;
      TextareaAutosize: typeof TextareaAutosize;
      Transition: typeof Transition;
      Fade: typeof Fade;
      Grow: typeof Grow;
      Slide: typeof Slide;
      Collapse: typeof Collapse;
      Zoom: typeof Zoom;
      useMediaQuery: typeof useMediaQuery;
      media: typeof media;
      Diagram: typeof Diagram;
      DiagramHost: typeof DiagramHost;
      TimingChart: typeof TimingChart;
      BarChart: typeof BarChart;
      LineChart: typeof LineChart;
      DonutChart: typeof DonutChart;
      Sparkline: typeof Sparkline;
      MermaidDiagram: typeof MermaidDiagram;
      mermaidTheme: typeof mermaidTheme;
    };
  }
}

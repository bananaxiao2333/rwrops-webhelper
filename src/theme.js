import { createTheme } from "@mui/material";

const tacticalDark = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#f59e0b" },
    error: { main: "#ef4444" },
    success: { main: "#22c55e" },
    info: { main: "#3b82f6" },
    background: { default: "#080c12", paper: "#131a24" },
    text: { primary: "#e8edf3", secondary: "#8899aa", disabled: "#556677" },
    divider: "#1e2d3d",
  },
  typography: {
    fontFamily: '"Rajdhani", sans-serif',
    fontSize: 14,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: "#131a24",
          backgroundImage: "none",
          border: "1px solid #1e2d3d",
          boxShadow: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontFamily: '"Share Tech Mono", monospace' } },
    },
    MuiBreadcrumbs: {
      styleOverrides: { separator: { color: "#556677" } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#182233",
          color: "#e8edf3",
          border: "1px solid #2a3a4e",
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: "0.7rem",
        },
      },
    },
  },
});

export default tacticalDark;

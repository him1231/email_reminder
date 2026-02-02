import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0b63ff" },
  },
  typography: {
    fontFamily: 'Inter, Roboto, -apple-system, "Segoe UI", "Helvetica Neue", Arial',
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
    },
  },
});

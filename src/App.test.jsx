import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/*
  Smoke test del renderer: fija que la app monta en frio y que las rutas de
  `App.jsx` resuelven al componente correcto segun el estado de `AuthContext`.

  Solo se ejercitan el arbol real de providers (`BranchProvider` + `App`), el
  `AuthProvider` real y la pagina `Login` real. Las paginas pesadas se sustituyen
  por stubs marcados con `data-testid`, de modo que el test mida el enrutado y no
  la red de cada vista.
*/

const authState = vi.hoisted(() => ({ session: null }));

vi.mock("./lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: authState.session },
        error: null,
      })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: vi.fn(() => thenableQuery()),
    rpc: vi.fn(async () => ({ data: null, error: null })),
    channel: vi.fn(() => {
      const channel = { on: vi.fn(), subscribe: vi.fn() };
      channel.on.mockReturnValue(channel);
      channel.subscribe.mockReturnValue(channel);
      return channel;
    }),
    removeChannel: vi.fn(async () => "ok"),
  },
  warmupSupabaseConnection: vi.fn(),
}));

vi.mock("./services/products/productCatalogService", () => ({
  fetchDepartments: vi.fn(async () => ({
    success: true,
    data: [],
    error: null,
    partial: false,
  })),
  fetchBranchCatalog: vi.fn(async () => ({
    success: true,
    data: { products: [], kardexProducts: [] },
    error: null,
    partial: false,
  })),
}));

const pageStub = (testId) => ({ default: () => <div data-testid={testId} /> });

vi.mock("./pages/CashRegister/CashRegister", () => {
  return pageStub("page-cash-register");
});
vi.mock("./pages/Dashboard/Dashboard", () => {
  return pageStub("page-dashboard");
});
vi.mock("./pages/Products/Products", () => {
  return pageStub("page-products");
});
vi.mock("./pages/Inventory/Inventory", () => {
  return pageStub("page-inventory");
});
vi.mock("./pages/Settings/Settings", async () => {
  const { useLocation } = await import("react-router-dom");
  function SettingsStub() {
    const location = useLocation();
    return <div data-testid="page-settings" data-path={location.pathname} />;
  }
  return { default: SettingsStub };
});
vi.mock("./pages/CashCut/CashCut", () => {
  return pageStub("page-cashcut");
});
vi.mock("./pages/Invoices/Invoices", () => {
  return pageStub("page-invoices");
});
vi.mock("./pages/Customers/Customers", () => {
  return pageStub("page-customers");
});
vi.mock("./pages/Reports/Reports", () => {
  return pageStub("page-reports");
});

import { supabase } from "./lib/supabaseClient";
import { fetchDepartments } from "./services/products/productCatalogService";
import { BranchProvider } from "./contexts/BranchContext";
import App from "./App";

const thenableQuery = (result = { data: [], error: null }) => {
  const query = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    ilike: vi.fn(),
    is: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };

  Object.values(query).forEach((method) => method.mockReturnValue(query));

  query.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected);

  return query;
};

const signIn = () => {
  authState.session = {
    access_token: "token-de-prueba",
    user: {
      id: "user-1",
      email: "cajero@crokets.test",
      user_metadata: { username: "cajero" },
    },
  };
};

const openCashRegister = () => {
  localStorage.setItem("cashRegistered", "true");
  localStorage.setItem("cashAmount", "1500");
};

const lockScreen = () => {
  localStorage.setItem("isLocked", "true");
};

// Montaje con la ruta inicial controlada por el test, equivalente a lo que
// hace `HashRouter` en produccion pero con `initialEntries` explicito.
const renderAppAt = (path) => {
  const MemoryRouterAt = ({ children }) => (
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  );

  return render(
    <BranchProvider>
      <App RouterComponent={MemoryRouterAt} />
    </BranchProvider>
  );
};

// Montaje con el arbol de `src/main.jsx` sin inyectar router: `App` debe usar
// el `HashRouter` por omision.
const renderAppWithDefaultRouter = () =>
  render(
    <BranchProvider>
      <App />
    </BranchProvider>
  );

// Cada caso arranca sin sesion, sin caja y sin puente de Electron: el estado
// que se necesita se declara justo antes de renderizar.
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  authState.session = null;
  delete window.electronAPI;
});

const expectLoginScreen = async () => {
  expect(await screen.findByLabelText("Usuario")).toBeTruthy();
  expect(screen.getByLabelText("Contraseña")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ingresar" })).toBeTruthy();
};

describe("App: montaje del renderer en frio", () => {
  it("monta la jerarquia de main.jsx y transiciona de LoadingScreen a /login", async () => {
    renderAppWithDefaultRouter();

    expect(screen.getByRole("status", { name: "Cargando" })).toBeTruthy();

    await expectLoginScreen();

    expect(fetchDepartments).toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("monta la ruta publica /login sin sesion activa", async () => {
    renderAppAt("/login");

    await expectLoginScreen();

    expect(screen.queryByTestId("page-dashboard")).toBeNull();
    expect(screen.queryByTestId("page-cash-register")).toBeNull();
  });

  it("tolera la ausencia de window.electronAPI sin romper el renderizado", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(window.electronAPI).toBeUndefined();

    renderAppAt("/login");

    await expectLoginScreen();

    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("pide el escalado de la ventana cuando el puente de Electron existe", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    window.electronAPI = { invoke };

    renderAppAt("/login");

    await expectLoginScreen();

    expect(invoke).toHaveBeenCalledWith("configure-zoom", {
      baseWidth: 1500,
      baseHeight: 850,
      minZoom: 0.9,
      maxZoom: expect.any(Number),
    });
  });
});

describe("App: guardas de rutas de AuthContext", () => {
  it("redirige a /cash-register una ruta operativa sin caja abierta", async () => {
    signIn();

    renderAppAt("/dashboard");

    expect(await screen.findByTestId("page-cash-register")).toBeTruthy();
    expect(screen.queryByTestId("page-dashboard")).toBeNull();
    expect(screen.queryByLabelText("Usuario")).toBeNull();
  });

  it("deja pasar a /dashboard con sesion y caja abierta", async () => {
    signIn();
    openCashRegister();

    renderAppAt("/dashboard");

    expect(await screen.findByTestId("page-dashboard")).toBeTruthy();
    expect(screen.queryByTestId("page-cash-register")).toBeNull();
    expect(screen.queryByLabelText("Usuario")).toBeNull();
  });

  it("expulsa a /dashboard desde /cash-register cuando ya hay caja abierta", async () => {
    signIn();
    openCashRegister();

    renderAppAt("/cash-register");

    expect(await screen.findByTestId("page-dashboard")).toBeTruthy();
    expect(screen.queryByTestId("page-cash-register")).toBeNull();
  });

  it("mantiene al usuario en /login cuando la pantalla esta bloqueada", async () => {
    signIn();
    openCashRegister();
    lockScreen();

    renderAppAt("/dashboard");

    await expectLoginScreen();

    expect(screen.queryByTestId("page-dashboard")).toBeNull();
  });

  it("lleva a /cash-register desde /login con sesion y sin caja", async () => {
    signIn();

    renderAppAt("/login");

    expect(await screen.findByTestId("page-cash-register")).toBeTruthy();
    expect(screen.queryByLabelText("Usuario")).toBeNull();
  });

  it("lleva a /dashboard desde /login con sesion y caja abierta", async () => {
    signIn();
    openCashRegister();

    renderAppAt("/login");

    expect(await screen.findByTestId("page-dashboard")).toBeTruthy();
    expect(screen.queryByLabelText("Usuario")).toBeNull();
  });
});

describe("App: rutas administrativas y wildcard", () => {
  it("deja entrar a /settings sin caja abierta", async () => {
    signIn();

    renderAppAt("/settings");

    expect(await screen.findByTestId("page-settings")).toBeTruthy();
    expect(screen.queryByTestId("page-cash-register")).toBeNull();
  });

  it("acepta las subrutas de /settings sin caja abierta", async () => {
    signIn();

    renderAppAt("/settings/caja");

    const page = await screen.findByTestId("page-settings");
    expect(page.getAttribute("data-path")).toBe("/settings/caja");
    expect(screen.queryByTestId("page-cash-register")).toBeNull();
  });

  it("redirige /profiles a /settings/usuarios para mantener la retrocompatibilidad", async () => {
    signIn();

    renderAppAt("/profiles");

    const page = await screen.findByTestId("page-settings");
    expect(page.getAttribute("data-path")).toBe("/settings/usuarios");
    expect(screen.queryByLabelText("Usuario")).toBeNull();
  });

  it("resuelve la ruta raiz a /dashboard con sesion y caja abierta", async () => {
    signIn();
    openCashRegister();

    renderAppAt("/");

    expect(await screen.findByTestId("page-dashboard")).toBeTruthy();
  });

  it("resuelve la ruta raiz a /login sin sesion", async () => {
    renderAppAt("/");

    await expectLoginScreen();
  });

  it("redirige una ruta desconocida a /login sin sesion", async () => {
    renderAppAt("/ruta-inexistente");

    await expectLoginScreen();
  });

  it("redirige una ruta desconocida a /dashboard con sesion y caja abierta", async () => {
    signIn();
    openCashRegister();

    renderAppAt("/ruta-inexistente");

    expect(await screen.findByTestId("page-dashboard")).toBeTruthy();
  });
});

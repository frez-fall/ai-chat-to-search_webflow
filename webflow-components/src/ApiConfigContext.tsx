import React, { createContext, useContext } from "react";

type ApiConfig = { apiBaseUrl: string };

const ApiCtx = createContext<ApiConfig | null>(null);

export function ApiConfigProvider({
  apiBaseUrl,
  children,
}: {
  apiBaseUrl: string;
  children: React.ReactNode;
}) {
  return <ApiCtx.Provider value={{ apiBaseUrl }}>{children}</ApiCtx.Provider>;
}

export function useApiConfig() {
  const v = useContext(ApiCtx);
  if (!v) throw new Error("useApiConfig must be used within ApiConfigProvider");
  return v;
}
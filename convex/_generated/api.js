export const api = new Proxy(
  {},
  {
    get: (_, prop) =>
      new Proxy(
        {},
        {
          get: (_, subProp) => `${String(prop)}:${String(subProp)}`,
        }
      ),
  }
);

export const internal = new Proxy(
  {},
  {
    get: (_, prop) =>
      new Proxy(
        {},
        {
          get: (_, subProp) => `${String(prop)}:${String(subProp)}`,
        }
      ),
  }
);

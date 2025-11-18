export async function getComponentByPath(
  componentPath: string,
  props: Record<string, any> = {}
): Promise<JSX.Element | null> {
  try {
    // Helper: flatten structured custom_attrs ({ type, value }) to raw values
    const flattenProps = (input: Record<string, any> = {}) => {
      const out: Record<string, any> = {};
      Object.entries(input).forEach(([k, v]) => {
        if (v && typeof v === "object" && "type" in v && "value" in v) {
          const t = (v as any).type;
          const val = (v as any).value;
          // For component slots, pass the nested component object (or null) as is
          if (t === "component") {
            out[k] = val;
          } else {
            out[k] = val;
          }
        } else {
          out[k] = v;
        }
      });
      return out;
    };

    // Import dinámico usando import.meta.glob (Vite) en lugar de alias en runtime
    const modulesTsx = import.meta.glob('/src/library/**/index.tsx');
    const modulesTs = import.meta.glob('/src/library/**/index.ts');

    const keyTsx = `/src/library/${componentPath}/index.tsx`;
    const keyTs = `/src/library/${componentPath}/index.ts`;
    const loader = (modulesTsx as Record<string, () => Promise<any>>)[keyTsx] || (modulesTs as Record<string, () => Promise<any>>)[keyTs];

    if (!loader) {
      console.warn(`⚠️ No se encontró el módulo para ${componentPath}`);
      return null;
    }

    const module = await loader();

    // Obtenemos el componente (default export)
    const Component = module.default;

    if (!Component) {
      console.warn(`⚠️ No se encontró un default export en ${componentPath}`);
      return null;
    }

    // Ensure we pass flattened values to avoid rendering objects as React children
    const flattened = flattenProps(props);
    return <Component {...flattened} />;
  } catch (error) {
    console.error(`❌ Error al cargar el componente: ${componentPath}`, error);
    return null;
  }
}
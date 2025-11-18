export async function getComponentsByPath(
  componentPath: string,
  props: Record<string, any> = {}
): Promise<JSX.Element | null> {
  try {
    const flattenProps = (input: Record<string, any> = {}) => {
      const out: Record<string, any> = {};
      Object.entries(input).forEach(([k, v]) => {
        if (v && typeof v === "object" && "type" in v && "value" in v) {
          const t = (v as any).type;
          const val = (v as any).value;
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

    const module = await import(`@/library/${componentPath}.tsx`);
    const Component = module.default;

    if (!Component) return null;
    const flattened = flattenProps(props);
    return <Component key={props?.id || componentPath} {...flattened} />;
  } catch (error) {
    console.error(`Error al importar componente: ${componentPath}`, error);
    return null;
  }
}

export async function getComponentsByPath(
  componentPath: string,
  props: Record<string, any> = {}
): Promise<JSX.Element | null> {
  try {
    const module = await import(`../library/${componentPath}.tsx`);
    const Component = module.default;

    if (!Component) return null;
    return <Component key={props?.id || componentPath} {...props} />;
  } catch (error) {
    console.error(`Error al importar componente: ${componentPath}`, error);
    return null;
  }
}

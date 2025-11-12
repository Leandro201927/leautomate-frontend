export async function getComponentByPath(
  componentPath: string,
  props: Record<string, any> = {}
): Promise<JSX.Element | null> {
  try {
    // Import dinámico según la ruta del componente
    const module = await import(`@/../library/${componentPath}.tsx`);

    // Obtenemos el componente (default export)
    const Component = module.default;

    if (!Component) {
      console.warn(`⚠️ No se encontró un default export en ${componentPath}`);
      return null;
    }

    return <Component {...props} />;
  } catch (error) {
    console.error(`❌ Error al cargar el componente: ${componentPath}`, error);
    return null;
  }
}
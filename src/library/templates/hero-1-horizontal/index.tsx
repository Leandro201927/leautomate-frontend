
import { useEffect, useState } from "react";
import { getComponentByPath } from "@/utils/getComponentByPath";

export default function Hero1Horizontal(props: any) {
  const [LeftSection, setLeftSection] = useState<JSX.Element | null>(null);

  useEffect(() => {
    if (props.hero_left_section_component) {
      const { atomic_hierarchy, name } = props.hero_left_section_component;
      const path = `${atomic_hierarchy}s/${name}`;
      const attrs = props.hero_left_section_component.custom_attrs || {};

      getComponentByPath(path, attrs).then((child) => {
        if (!child) { setLeftSection(null); return; }
        setLeftSection(
          <div data-component-path={path} data-component-slot="hero_left_section_component">
            {child}
          </div>
        );
      });
    } else {
      setLeftSection(null);
    }
  }, [props.hero_left_section_component, JSON.stringify(props.hero_left_section_component?.custom_attrs || {})]);

  return (
    <>
      <section className="hero">
        <h1>{props.title}</h1>
        <p>{props.description}</p>
        {LeftSection}
      </section>
    </>
  );
}

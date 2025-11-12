
import { useEffect, useState } from "react";
import { getComponentByPath } from "@/utils/getComponentByPath";

export default function Hero1Horizontal(props: any) {
  const [LeftSection, setLeftSection] = useState<JSX.Element | null>(null);

  useEffect(() => {
    if (props.hero_left_section_component) {
      const { atomic_hierarchy, name } = props.hero_left_section_component;
      const path = `${atomic_hierarchy}s/${name}`;

      getComponentByPath(path, props.hero_left_section_component.custom_attrs).then(setLeftSection);
    }
  }, [props.hero_left_section_component]);

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

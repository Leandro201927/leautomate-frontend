import './style.scss';

export default function Footer1(props: any) {
  const navRaw = Array.isArray(props.navigation) ? props.navigation : [];
  const navItems = navRaw
    .map((it: any) => (it && typeof it === 'object' && 'type' in it && 'value' in it ? it.value : it))
    .filter((it: any) => it && typeof it === 'object' && ('label' in it || 'url' in it));

  return (
    <>
      <footer style={{ backgroundColor: props.color_background }} className="footer-1">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '8px 16px' }}>
          {props.logo && (
            <div className="logo-container">
              <img src={props.logo} alt="Logo" style={{ maxHeight: '60px', objectFit: 'contain' }} />
            </div>
          )}
          <nav>
            <ul style={{ display: 'flex', alignItems: 'center', gap: 16, listStyle: 'none', margin: 0, padding: 0 }}>
              {navItems.map((item: any, idx: number) => (
                <li key={idx} style={{ fontSize: 14 }}>
                  <a href={String(item.url || '#')} style={{ textDecoration: 'none', color: 'inherit' }}>{String(item.label || '')}</a>
                </li>
              ))}
            </ul>
          </nav>
          {(props.cta_button_text || props.cta_button_background) && (
            <button
              style={{
                backgroundColor: props.cta_button_background,
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              {String(props.cta_button_text || 'CTA')}
            </button>
          )}
        </div>
      </footer>
    </>
  );
}

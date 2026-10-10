import { Icon } from "@iconify/react";

/**
 * The shell every visualization renders inside.
 *
 * A record page used to be a stack of self-contained panels — each one drew a
 * border, a filled surface and an uppercase monospace header. VizFrame replaces
 * that with a plain article section: a normal-case heading with a hairline rule
 * (like the field sections further down the page), an optional prose lead, and
 * the component's own content flowing beneath. The result reads as one article
 * about the item rather than a row of separate dashboards.
 */
export default function VizFrame({ icon, title, count, lead, actions, children }) {
  return (
    <section className="viz-section">
      <div className="viz-section-title">
        {icon && <Icon icon={icon} className="viz-icon" />}
        <h2>{title}</h2>
        {count != null && <span className="viz-count">{count}</span>}
        {actions && <span className="viz-actions">{actions}</span>}
      </div>
      {lead && <p className="viz-lead">{lead}</p>}
      {children}
    </section>
  );
}

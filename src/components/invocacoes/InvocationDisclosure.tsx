import { Children, cloneElement, isValidElement, useState, type DetailsHTMLAttributes, type HTMLAttributes, type ReactElement } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** Keeps the native details element, identifiers and mounted field state. */
export function InvocationDisclosure({ open = false, children, ...props }: DetailsHTMLAttributes<HTMLDetailsElement>) {
  const [expanded, setExpanded] = useState(Boolean(open));
  const [nativeOpen, setNativeOpen] = useState(Boolean(open));
  const reduceMotion = useReducedMotion() === true;
  const items = Children.toArray(children);
  const summaryIndex = items.findIndex(child => isValidElement(child) && child.type === 'summary');
  const summary = items[summaryIndex] as ReactElement<HTMLAttributes<HTMLElement>> | undefined;
  const body = items.filter((_, index) => index !== summaryIndex);
  return <details {...props} open={nativeOpen} data-expanded={expanded} onToggle={event => {
    props.onToggle?.(event);
    const changedOpen = event.currentTarget.open;
    if (changedOpen !== nativeOpen) {
      setNativeOpen(changedOpen);
      setExpanded(changedOpen);
    }
  }}>
    {summary && cloneElement(summary, {
      'aria-expanded': expanded,
      onClick: event => {
        summary.props.onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        if (!expanded) setNativeOpen(true);
        setExpanded(value => !value);
      },
    })}
    <motion.div className="inv-disclosure-content" initial={false}
      animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0, y: reduceMotion || expanded ? 0 : -4 }}
      transition={reduceMotion
        ? { height: { duration: 0 }, opacity: { duration: 0.14 }, y: { duration: 0 } }
        : { duration: 0.24, ease: 'easeOut' }}
      aria-hidden={!expanded} inert={!expanded}
      onAnimationComplete={() => { if (!expanded) setNativeOpen(false); }}>
      {body}
    </motion.div>
  </details>;
}

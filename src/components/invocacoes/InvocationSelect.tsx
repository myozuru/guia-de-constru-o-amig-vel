import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import './InvocationSelect.css';

type Choice = { value: string; text: string; disabled: boolean; group: string };
/** Custom presentation backed by a real native select: callers retain React change events. */
export const InvocationSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function InvocationSelect({ children, className, multiple, disabled, onChange, value, defaultValue, ...props }, forwardedRef) {
    const native = React.useRef<HTMLSelectElement>(null);
    const root = React.useRef<HTMLSpanElement>(null);
    const uid = React.useId();
    const [choices, setChoices] = React.useState<Choice[]>([]);
    const [selected, setSelected] = React.useState<string[]>([]);
    const [label, setLabel] = React.useState('');
    const [open, setOpen] = React.useState(false);
    const typeahead = React.useRef({ text: '', time: 0 });
    React.useImperativeHandle(forwardedRef, () => native.current!);
    const refresh = () => {
      const element = native.current;
      if (!element) return;
      setSelected(Array.from(element.selectedOptions, option => option.value));
    };
    React.useLayoutEffect(() => {
      const element = native.current!;
      setChoices(Array.from(element.options, option => ({
        value: option.value, text: option.label, disabled: option.disabled || !!(option.parentElement instanceof HTMLOptGroupElement && option.parentElement.disabled),
        group: option.parentElement instanceof HTMLOptGroupElement ? option.parentElement.label : '',
      })));
      refresh();
      const labels = Array.from(element.labels ?? []);
      const text = labels.map(item => {
        const copy = item.cloneNode(true) as HTMLElement;
        copy.querySelectorAll('[data-invocation-select], select, input, button').forEach(node => node.remove());
        return copy.textContent?.trim() ?? '';
      }).join(' ').trim();
      setLabel(text);
    }, [children, value, defaultValue, multiple, props.id]);
    React.useEffect(() => {
      const element = native.current!;
      const focusTrigger = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target.closest('button, input, select, a')) return;
        root.current?.querySelector<HTMLButtonElement>('button')?.focus();
      };
      const labels = Array.from(element.labels ?? []);
      labels.forEach(item => item.addEventListener('click', focusTrigger));
      const reset = () => { queueMicrotask(refresh); };
      element.form?.addEventListener('reset', reset);
      return () => {
        labels.forEach(item => item.removeEventListener('click', focusTrigger));
        element.form?.removeEventListener('reset', reset);
      };
    }, [props.id]);
    const commit = (next: string[]) => {
      const element = native.current;
      if (!element || disabled) return;
      Array.from(element.options).forEach(option => { option.selected = next.includes(option.value); });
      element.dispatchEvent(new Event('change', { bubbles: true }));
      refresh();
    };
    const accessible = {
      'aria-label': props['aria-label'] || (!props['aria-labelledby'] && !label ? 'Escolher opção' : undefined),
      'aria-labelledby': props['aria-labelledby'] || (!props['aria-label'] && label ? `${uid}-label` : undefined),
      'aria-describedby': props['aria-describedby'],
      'aria-invalid': props['aria-invalid'],
      'aria-required': props.required || undefined,
    };
    // Radix reserves the empty string. Map every option by index, avoiding value collisions.
    const optionKey = (index: number) => `${uid}-option-${index}`;
    const current = choices.findIndex(choice => choice.value === selected[0]);
    const selectedLabels = selected.map(item => choices.find(choice => choice.value === item)?.text || 'Sem seleção');
    const summary = selected.length ? `${selectedLabels.slice(0, 2).join(', ')}${selected.length > 2 ? ` +${selected.length - 2}` : ''}` : 'Escolher opções';
    const menuStyle: React.CSSProperties = { background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', overscrollBehavior: 'contain' };
    return <span ref={root} data-invocation-select="" className="inv-select-field">
      {label && <span id={`${uid}-label`} className="sr-only">{label}</span>}
      <select {...props} ref={native} className="inv-select-native" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1}
        multiple={multiple} disabled={disabled} value={value} defaultValue={defaultValue}
        onChange={event => { onChange?.(event); refresh(); }}>{children}</select>
      {multiple ? <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild><button type="button" disabled={disabled} {...accessible}
          className={`inv-select-trigger inv-select-trigger-multiple ${className ?? ''}`}><span>{summary}</span><span className="inv-select-affordance" aria-hidden="true">Escolher</span><ChevronDown size={16} aria-hidden="true" /></button></PopoverTrigger>
        <PopoverContent className="inv-select-menu inv-select-multiple" style={menuStyle} align="start"
          onKeyDown={event => {
            if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.key === ' ') return;
            const now = Date.now();
            typeahead.current.text = now - typeahead.current.time < 700 ? typeahead.current.text + event.key : event.key;
            typeahead.current.time = now;
            const index = choices.findIndex(choice => !choice.disabled && choice.text.toLocaleLowerCase().startsWith(typeahead.current.text.toLocaleLowerCase()));
            if (index >= 0) { event.preventDefault(); event.currentTarget.querySelector<HTMLInputElement>(`[data-option-index="${index}"]`)?.focus(); }
          }}>
          <div role="group" {...accessible} className="inv-select-checklist" style={{ maxHeight: 280, overflowY: 'auto', overscrollBehavior: 'contain' }}>
            <p className="inv-select-count" aria-live="polite">{selected.length} selecionada{selected.length === 1 ? '' : 's'} • marque uma ou mais opções</p>
            {choices.length === 0 && <p className="inv-select-empty">Nenhuma opção disponível</p>}
            {choices.map((choice, index) => <label key={optionKey(index)} className="inv-select-check-option">
              <input type="checkbox" data-option-index={index} disabled={choice.disabled} checked={selected.includes(choice.value)}
                onChange={event => commit(event.target.checked ? [...selected, choice.value] : selected.filter(item => item !== choice.value))} />
              <span>{choice.group && <small>{choice.group}: </small>}{choice.text || 'Sem seleção'}</span>
            </label>)}
          </div>
        </PopoverContent>
      </Popover> : <Select disabled={disabled || choices.length === 0} value={current < 0 ? '' : optionKey(current)}
        onValueChange={key => { const choice = choices.find((_, index) => optionKey(index) === key); if (choice && !choice.disabled) commit([choice.value]); }}>
        <SelectTrigger {...accessible} className={`inv-select-trigger ${className ?? ''}`}>
          <SelectValue placeholder="Escolher opção">{current >= 0 ? choices[current].text || 'Sem seleção' : 'Escolher opção'}</SelectValue>
          <span className="inv-select-affordance" aria-hidden="true">Escolher</span>
        </SelectTrigger>
        <SelectContent className="inv-select-menu" style={menuStyle}>
          {choices.map((choice, index) => <SelectItem key={optionKey(index)} value={optionKey(index)} disabled={choice.disabled}>
            {choice.group && <small>{choice.group}: </small>}{choice.text || 'Sem seleção'}
          </SelectItem>)}
        </SelectContent>
      </Select>}
    </span>;
  }
);

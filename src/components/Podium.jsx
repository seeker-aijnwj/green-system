import { Medal } from 'lucide-react';

const STYLE = [
  'bg-sun-500 text-bark-900 sm:pt-8',
  'bg-forest-100 text-forest-900 sm:pt-4',
  'bg-amber-100 text-amber-900'
];

/** Podium des trois premiers. items = [{ name, sub, value }] déjà triés. */
export default function Podium({ items }) {
  const order = [1, 0, 2].filter((i) => items[i]);
  return (
    <ol className="grid list-none grid-cols-3 items-end gap-2 p-0 sm:gap-4" aria-label="Podium">
      {order.map((i) => (
        <li key={i} className={`rounded-2xl p-3 text-center shadow-sm sm:p-4 ${STYLE[i]}`}>
          <Medal className="mx-auto size-6 sm:size-8" aria-hidden="true" />
          <span className="mt-1 block text-xs font-bold uppercase opacity-70">{i + 1}<sup>{i === 0 ? 'er' : 'e'}</sup></span>
          <strong className="mt-1 block text-sm leading-tight sm:text-base">{items[i].name}</strong>
          <span className="mt-1 block text-xs opacity-80">{items[i].sub}</span>
          <span className="mt-1 block text-lg font-extrabold">{items[i].value}</span>
        </li>
      ))}
    </ol>
  );
}

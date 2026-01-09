const BASE_CLASSES = 'cursor-pointer rounded-full border border-transparent px-[1.4rem] py-[0.6rem] font-[inherit] text-[0.95rem] font-medium transition-[background-color,border-color,transform,box-shadow] duration-150 ease-out disabled:cursor-default disabled:opacity-55 disabled:shadow-none enabled:hover:-translate-y-px enabled:hover:shadow-[0_14px_34px_rgba(59,130,246,0.45)]';
const VARIANT_CLASSES = {
    primary: 'bg-gradient-to-r from-[#38bdf8] to-[#22c55e] text-[#0b1120] shadow-[0_10px_30px_rgba(56,189,248,0.4)]',
    secondary: 'border-[rgba(148,163,184,0.6)] bg-slate-900/90 text-gray-200',
};
export function Button({ children, variant = 'primary', className = '', ...rest }) {
    return (<button className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`.trim()} {...rest}>
      {children}
    </button>);
}

// Flat, fully round button. One fill colour; `primary` uses the accent.
export default function Button({ variant, className = '', children, ...rest }) {
  return <button className={`btn${variant ? ` ${variant}` : ''}${className ? ` ${className}` : ''}`} {...rest}>{children}</button>;
}

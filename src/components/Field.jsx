export default function Field({ label, id, as: Tag = 'input', children, ...rest }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Tag id={id} name={id} {...rest}>{children}</Tag>
    </div>
  );
}

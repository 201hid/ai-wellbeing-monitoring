export function bindRangeControl(inputEl, valueEl, {
  suffix = "",
  transform = (v) => v,
  format = (v) => String(v),
  onChange
}) {
  if (!inputEl || !valueEl) return;
  const update = () => {
    const raw = Number(inputEl.value);
    const transformed = transform(raw);
    valueEl.textContent = `${format(transformed)}${suffix}`;
    onChange(transformed);
  };
  inputEl.addEventListener("input", update);
  update();
}

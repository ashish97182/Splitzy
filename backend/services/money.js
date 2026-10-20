export function toMinorUnits(value) {
  const text = String(value);
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) {
    throw new Error("Money values must be finite decimal amounts.");
  }

  const [, sign, whole, fraction = ""] = match;
  if (fraction.length > 2 && /[1-9]/.test(fraction.slice(2))) {
    throw new Error("Money values may have at most two decimal places.");
  }

  const minor = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  if (!Number.isSafeInteger(minor)) {
    throw new Error("Money value exceeds the supported range.");
  }
  return sign === "-" ? -minor : minor;
}

export function fromMinorUnits(minor) {
  if (!Number.isSafeInteger(minor)) {
    throw new Error("Minor-unit amount must be a safe integer.");
  }
  return Number((minor / 100).toFixed(2));
}

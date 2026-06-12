/**
 * Luma-style square loader (adapted from the user's spinner spec) in the
 * app palette: accent ring chasing a muted ring.
 */
export default function Spinner({ size = 36 }: { size?: number }) {
  return (
    <div
      className="luma-spin"
      style={{ width: size, height: size }}
      aria-label="Working"
      role="status"
    >
      <span />
      <span />
    </div>
  );
}

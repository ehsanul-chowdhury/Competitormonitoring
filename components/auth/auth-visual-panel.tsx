/** Pure color field, no copy or iconography. The brand gradient is the
 * whole point, so anything layered on top would just compete with it. */
export function AuthVisualPanel() {
  return (
    <div
      aria-hidden="true"
      className="relative hidden overflow-hidden bg-black lg:block"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #000000 0%, #04150f 22%, #063b27 42%, #0a3b3a 58%, #082a46 76%, #000a16 100%)",
        }}
      />
      <div className="absolute top-[8%] left-[38%] size-[30rem] rounded-full bg-emerald-500/80 blur-[130px]" />
      <div className="absolute top-[28%] left-[8%] size-[24rem] rounded-full bg-emerald-400/40 blur-[120px]" />
      <div className="absolute bottom-[6%] left-[42%] size-[32rem] rounded-full bg-blue-600/70 blur-[140px]" />
      <div className="absolute top-[-10%] right-[-10%] size-[26rem] rounded-full bg-black blur-[110px]" />
    </div>
  )
}

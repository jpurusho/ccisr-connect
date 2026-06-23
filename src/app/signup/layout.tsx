export default function SignupPublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Top safe area for iOS notch/status bar */}
      <div className="safe-top bg-slate-50" />

      {/* Content */}
      <div className="flex-1">
        {children}
      </div>

      {/* Bottom safe area for iOS home indicator */}
      <div className="safe-bottom bg-slate-50" />
    </div>
  )
}

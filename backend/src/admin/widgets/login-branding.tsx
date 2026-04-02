import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"
import logo from "../../media/admin-logo.png"

const LoginBranding = () => {
  useEffect(() => {
    const styleId = "af-login-override"
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style")
      style.id = styleId
      style.textContent = `
        /* Hide default Medusa AvatarBox and heading on login page */
        .bg-ui-bg-subtle .max-w-\\[280px\\] > *:nth-child(1),
        .bg-ui-bg-subtle .max-w-\\[280px\\] > *:nth-child(2) {
          display: none !important;
        }
      `
      document.head.appendChild(style)
    }
    return () => {
      document.getElementById("af-login-override")?.remove()
    }
  }, [])

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: "16px",
        textAlign: "center",
      }}
    >
      {/* Logo */}
      <img
        src={logo}
        alt="Anointed Feet"
        style={{ width: 140, marginBottom: 14 }}
      />

      {/* Heading */}
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#111",
          margin: "0 0 6px 0",
        }}
      >
        Welcome to Anointed Feet
      </h2>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 13,
          color: "#6b7280",
          margin: 0,
        }}
      >
        Sign in to access the account area
      </p>
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "login.before",
})

export default LoginBranding

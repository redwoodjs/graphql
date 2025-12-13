import React from 'react'

const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: '12px',
  padding: '2rem',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.3s ease',
  textDecoration: 'none',
  color: 'inherit',
  display: 'block',
  border: '2px solid transparent',
}

const cardHoverStyle = {
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
  transform: 'translateY(-4px)',
  borderColor: '#c4f482',
}

export default function ChooseFrameworkPage() {
  const [hoveredCard, setHoveredCard] = React.useState(null)

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: '#f8f9fa',
      }}
    >
      <div style={{ maxWidth: '900px', width: '100%' }}>
        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: '900',
            textAlign: 'center',
            marginBottom: '1rem',
            color: '#1a1a1a',
          }}
        >
          Choose Your Framework
        </h1>
        <p
          style={{
            fontSize: '1.125rem',
            textAlign: 'center',
            color: '#666',
            marginBottom: '3rem',
          }}
        >
          RedwoodJS offers two frameworks to suit different needs
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginTop: '2rem',
          }}
        >
          {/* RedwoodSDK Card */}
          <a
            href="https://docs.rwsdk.com"
            style={{
              ...cardStyle,
              ...(hoveredCard === 'sdk' ? cardHoverStyle : {}),
            }}
            onMouseEnter={() => setHoveredCard('sdk')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ textAlign: 'center' }}>
              <img
                src="https://avatars.githubusercontent.com/u/45050444?s=200&v=4"
                alt="RedwoodSDK"
                style={{
                  width: '120px',
                  height: '120px',
                  marginBottom: '1.5rem',
                  objectFit: 'contain',
                }}
              />
              <h2
                style={{
                  fontSize: '1.75rem',
                  fontWeight: '700',
                  marginBottom: '0.5rem',
                  color: '#1a1a1a',
                }}
              >
                RedwoodSDK
              </h2>
              <p
                style={{
                  fontSize: '1rem',
                  color: '#666',
                  marginTop: '0.5rem',
                  lineHeight: '1.6',
                }}
              >
                The Keep it Simple Stack. Server-first, React, Vite, TypeScript,
                & Cloudflare
              </p>
            </div>
          </a>

          {/* RedwoodGraphQL Card */}
          <a
            href="/docs/index/"
            style={{
              ...cardStyle,
              ...(hoveredCard === 'graphql' ? cardHoverStyle : {}),
            }}
            onMouseEnter={() => setHoveredCard('graphql')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ textAlign: 'center' }}>
              <img
                src="/img/logo.svg"
                alt="RedwoodGraphQL"
                style={{
                  width: '120px',
                  height: '120px',
                  marginBottom: '1.5rem',
                }}
              />
              <h2
                style={{
                  fontSize: '1.75rem',
                  fontWeight: '700',
                  marginBottom: '0.5rem',
                  color: '#1a1a1a',
                }}
              >
                RedwoodGraphQL
              </h2>
              <p
                style={{
                  fontSize: '1rem',
                  color: '#666',
                  marginTop: '0.5rem',
                  lineHeight: '1.6',
                }}
              >
                Legacy full-stack framework for building GraphQL APIs
              </p>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}

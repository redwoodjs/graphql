import { namedRoutes as routes } from '@redwoodjs/router/dist/namedRoutes'

import './NavigationLayout.css'

const Link = (props: any) => {
  return <a href={props.to}>{props.children}</a>
}

type NavigationLayoutProps = {
  children?: React.ReactNode
}

const NavigationLayout = ({ children }: NavigationLayoutProps) => {
  return (
    <div className="navigation-layout">
      <nav>
        <ul>
          <li>
            <Link to={routes.home()}>Home</Link>
          </li>
          <li>
            <Link to={routes.about()}>About</Link>
          </li>
        </ul>
      </nav>
      <main>{children}</main>
    </div>
  )
}

export default NavigationLayout

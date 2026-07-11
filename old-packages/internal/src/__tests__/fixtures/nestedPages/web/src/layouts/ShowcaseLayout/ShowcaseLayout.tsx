import type { FC } from 'react'
import { Link, routes } from '@redwoodjs/router'

const ShowcaseLayout: FC = ({ children }) => {
  return (
    <>
      <div className="bg-gradient-to-r from-teal-600 to-teal-800 mb-8">
        <nav className="max-w-screen-xl mx-auto pt-24 lg:pt-[5.5rem] pb-7 px-8">
          <Link
            className="group flex flex-row items-center no-underline space-x-2 text-sm"
            to={routes.showcase()}
          >
            <span aria-hidden="true" className="icon md-14 text-teal-100">
              arrow_back_ios
            </span>
            <span className="group-hover:underline text-teal-100">
              Back to the Showcase
            </span>
          </Link>
        </nav>
      </div>
      {children}
    </>
  )
}

export default ShowcaseLayout

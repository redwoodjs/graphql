import { Link, routes } from '@redwoodjs/router'
import { Toaster } from '@redwoodjs/web/toast'
import { Popover, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import i18n, { Languages } from 'src/i18n'

type MainLayoutProps = {
  children?: React.ReactNode
}

const PopoverLink = ({ children, route, link, title, desc }) => {
  const body = (
    <>
      <div className="flex items-center justify-center flex-shrink-0 p-2 w-10 h-10 bg-orange-100 rounded-lg sm:h-12 sm:w-12">
        {children}
      </div>
      <div className="ml-4">
        <p className="text-sm font-semibold text-stone-900">{title}</p>
        <p className="text-xs text-stone-500 font-normal">{desc}</p>
      </div>
    </>
  )
  const linkClassName =
    'flex items-center p-2 -m-3 transition duration-150 ease-in-out rounded-lg hover:bg-stone-50 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50 no-underline'

  if (route) {
    return (
      <Link to={route} className={linkClassName}>
        {body}
      </Link>
    )
  } else {
    return (
      <a href={link} className={linkClassName}>
        {body}
      </a>
    )
  }
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <>
      <Toaster toastOptions={{ className: 'mt-16' }} />
      <section
        className="fixed w-full z-10 bg-orange-50 text-orange-900 border-b border-orange-200"
        data-target="application.header"
      >
        <div className="max-w-screen-xl mx-auto px-4 lg:px-8">
          <header className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Link
                to={routes.home()}
                className="flex items-center text-2xl text-black font-bold tracking-tight"
              >
                <img
                  src="/images/logo.svg"
                  className="w-7"
                  data-target="application.logo"
                  alt="RedwoodJS Logo"
                />
                <h1 className="ml-3">
                  <img
                    src="/images/wordmark.svg"
                    className="w-32"
                    data-target="application.logo"
                    alt="RedwoodJS Logo"
                  />
                </h1>
              </Link>
              <div className="ml-4">
                <a
                  className="rounded-full px-2 py-1 bg-orange-200 hover:bg-orange-300 text-orange-600 hover:text-orange-700 text-xs font-mono font-normal no-underline transition duration-100"
                  href="https://github.com/redwoodjs/redwood/releases"
                  title="Go to Redwood's Releases"
                >
                  v1.0
                </a>
              </div>
            </div>
            <nav className="hidden lg:block mx-8 pr-28">
              <ul className="flex items-center space-x-4 font-semibold text-sm ml-8">
                <li className="">
                  <a
                    href="https://learn.redwoodjs.com"
                    className="text-orange-700 hover:text-teal-700 no-underline"
                  >
                    Docs
                  </a>
                </li>
                <li className="pl-4">
                  <Popover className="relative">
                    {({ open }) => (
                      <>
                        <Popover.Button
                          className={`text-orange-700 hover:text-teal-700 font-semibold group rounded-md inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75`}
                        >
                          <span>Showcase</span>
                          <span
                            className={`${open ? '' : 'text-opacity-70'}
                  icon md-16 mt-1 h-5 w-5 transition ease-in-out duration-150`}
                          >
                            {open ? 'expand_less' : 'expand_more'}
                          </span>
                        </Popover.Button>
                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-200"
                          enterFrom="opacity-0 translate-y-1"
                          enterTo="opacity-100 translate-y-0"
                          leave="transition ease-in duration-150"
                          leaveFrom="opacity-100 translate-y-0"
                          leaveTo="opacity-0 translate-y-1"
                        >
                          <Popover.Panel className="absolute z-10 w-96 max-w-sm px-4 mt-3 transform -translate-x-1/2 left-1/2 sm:px-0 lg:max-w-3xl">
                            <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                              <div className="relative grid gap-8 bg-white p-7 lg:grid-rows-2">
                                <PopoverLink
                                  route={routes.examples()}
                                  title="Example Apps"
                                  desc="Learn all the features of Redwood with example apps and code"
                                >
                                  <span className="icon md-36 text-orange-600">
                                    construction
                                  </span>
                                </PopoverLink>

                                <PopoverLink
                                  route={routes.showcase()}
                                  title="Showcase"
                                  desc="Case studies of real-world apps and companies built with Redwood"
                                >
                                  <span className="icon md-36 text-orange-600">
                                    emoji_events
                                  </span>
                                </PopoverLink>
                              </div>
                            </div>
                          </Popover.Panel>
                        </Transition>
                      </>
                    )}
                  </Popover>
                </li>
                <li className="">
                  <Popover className="relative">
                    {({ open }) => (
                      <>
                        <Popover.Button
                          className={`text-orange-700 hover:text-teal-700 font-semibold group rounded-md inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75`}
                        >
                          <span>Community</span>
                          <span
                            className={`${open ? '' : 'text-opacity-70'}
                  icon md-16 mt-1 h-5 w-5 transition ease-in-out duration-150`}
                          >
                            {open ? 'expand_less' : 'expand_more'}
                          </span>
                        </Popover.Button>
                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-200"
                          enterFrom="opacity-0 translate-y-1"
                          enterTo="opacity-100 translate-y-0"
                          leave="transition ease-in duration-150"
                          leaveFrom="opacity-100 translate-y-0"
                          leaveTo="opacity-0 translate-y-1"
                        >
                          <Popover.Panel className="absolute z-10 w-96 max-w-sm px-4 mt-3 transform -translate-x-1/2 left-1/2 sm:px-0 lg:max-w-3xl">
                            <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                              <div className="relative grid gap-8 bg-white p-7 lg:grid-rows-2">
                                <PopoverLink
                                  link="https://community.redwoodjs.com"
                                  title="Discourse Forums"
                                  desc="Long-form discussions about Redwood, troubleshooting, show & tell"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 32 32"
                                    className="transition duration-200 fill-current text-orange-600"
                                  >
                                    <path d="M16.1357143,0 C7.37857143,0 0,7.03571429 0,15.7214286 C0,16 0.00714285714,32 0.00714285714,32 L16.1357143,31.9857143 C24.9,31.9857143 32,24.6785714 32,15.9928571 C32,7.30714286 24.9,0 16.1357143,0 Z M16,25.1428571 C14.6142857,25.1428571 13.2928571,24.8357143 12.1142857,24.2785714 L6.32142857,25.7142857 L7.95714286,20.3571429 C7.25714286,19.0642857 6.85714286,17.5785714 6.85714286,16 C6.85714286,10.95 10.95,6.85714286 16,6.85714286 C21.05,6.85714286 25.1428571,10.95 25.1428571,16 C25.1428571,21.05 21.05,25.1428571 16,25.1428571 Z"></path>
                                  </svg>
                                </PopoverLink>

                                <PopoverLink
                                  link="https://discord.gg/jjSYEQd"
                                  title="Discord Chat"
                                  desc="Watercooler, relationship building, quick discussion and help"
                                >
                                  <svg
                                    viewBox="0 0 36 36"
                                    className="fill-current text-orange-600"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path d="M29.9699 7.7544C27.1043 5.44752 22.5705 5.05656 22.3761 5.04288C22.2284 5.03072 22.0806 5.0648 21.9531 5.1404C21.8257 5.216 21.7249 5.32937 21.6647 5.4648C21.5783 5.65936 21.5049 5.85949 21.4451 6.06384C23.3409 6.38424 25.6694 7.02864 27.7761 8.33616C27.8565 8.38604 27.9262 8.45126 27.9814 8.52809C28.0366 8.60493 28.0761 8.69187 28.0976 8.78397C28.1192 8.87607 28.1224 8.97151 28.1071 9.06485C28.0917 9.15819 28.0582 9.24759 28.0083 9.32796C27.9584 9.40833 27.8932 9.47809 27.8164 9.53325C27.7395 9.58842 27.6526 9.62791 27.5605 9.64947C27.4684 9.67103 27.373 9.67424 27.2796 9.65892C27.1863 9.6436 27.0969 9.61004 27.0165 9.56016C23.3949 7.3116 18.8719 7.2 17.9999 7.2C17.1287 7.2 12.6028 7.31232 8.98338 9.55944C8.90301 9.60932 8.81361 9.64288 8.72027 9.6582C8.62693 9.67352 8.53149 9.67031 8.43939 9.64875C8.25339 9.6052 8.09231 9.48955 7.99158 9.32724C7.89085 9.16493 7.85873 8.96925 7.90227 8.78325C7.94582 8.59725 8.06147 8.43617 8.22378 8.33544C10.3305 7.03152 12.659 6.38424 14.5547 6.06672C14.4453 5.7096 14.3459 5.48424 14.3387 5.4648C14.2788 5.32841 14.1776 5.2143 14.0493 5.13859C13.921 5.06288 13.7721 5.0294 13.6238 5.04288C13.4294 5.05728 8.89554 5.44752 5.99034 7.78536C4.47474 9.18792 1.43994 17.3894 1.43994 24.48C1.43994 24.6067 1.47378 24.7277 1.5357 24.8371C3.62802 28.5163 9.3405 29.4775 10.6423 29.52H10.6646C10.7782 29.5203 10.8903 29.4937 10.9916 29.4424C11.093 29.3911 11.1808 29.3165 11.2478 29.2248L12.5632 27.4133C9.01146 26.4967 7.19706 24.9386 7.09338 24.8458C6.95017 24.7194 6.86303 24.5412 6.85115 24.3506C6.83927 24.1599 6.90361 23.9723 7.03002 23.8291C7.15643 23.6859 7.33456 23.5988 7.52522 23.5869C7.71588 23.575 7.90345 23.6394 8.04666 23.7658C8.08842 23.8054 11.4299 26.64 17.9999 26.64C24.5807 26.64 27.9223 23.7938 27.9561 23.7658C28.0998 23.6403 28.2874 23.5769 28.4777 23.5896C28.668 23.6023 28.8456 23.69 28.9713 23.8334C29.0335 23.9042 29.0812 23.9864 29.1117 24.0756C29.1421 24.1647 29.1546 24.259 29.1486 24.353C29.1426 24.447 29.1181 24.5389 29.0766 24.6235C29.035 24.708 28.9772 24.7836 28.9065 24.8458C28.8028 24.9386 26.9884 26.4967 23.4367 27.4133L24.7528 29.2248C24.8198 29.3164 24.9074 29.3909 25.0087 29.4422C25.1099 29.4935 25.2218 29.5202 25.3353 29.52H25.3569C26.6601 29.4775 32.3719 28.5156 34.4649 24.8371C34.5261 24.7277 34.5599 24.6067 34.5599 24.48C34.5599 17.3894 31.5251 9.18864 29.9699 7.7544V7.7544ZM13.3199 21.6C11.9275 21.6 10.7999 20.3112 10.7999 18.72C10.7999 17.1288 11.9275 15.84 13.3199 15.84C14.7124 15.84 15.8399 17.1288 15.8399 18.72C15.8399 20.3112 14.7124 21.6 13.3199 21.6ZM22.6799 21.6C21.2875 21.6 20.1599 20.3112 20.1599 18.72C20.1599 17.1288 21.2875 15.84 22.6799 15.84C24.0724 15.84 25.1999 17.1288 25.1999 18.72C25.1999 20.3112 24.0724 21.6 22.6799 21.6Z"></path>
                                  </svg>
                                </PopoverLink>

                                <PopoverLink
                                  link="https://twitter.com/redwoodjs"
                                  title="Twitter"
                                  desc="Follow @redwoodjs for updates, new releases and community meetup announcements"
                                >
                                  <svg
                                    viewBox="0 0 34 34"
                                    className="fill-current text-orange-600"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path d="M10.693 31.025C23.528 31.025 30.532 20.4 30.532 11.186V10.285C31.892 9.282 33.065 8.075 34 6.664C32.725 7.225 31.382 7.599 29.988 7.769C31.4415 6.89552 32.5288 5.52436 33.048 3.91C31.688 4.726 30.192 5.287 28.628 5.61C27.5817 4.47537 26.1884 3.72011 24.6667 3.46265C23.1449 3.20519 21.5807 3.46011 20.2194 4.18742C18.8582 4.91474 17.7768 6.0733 17.1449 7.48142C16.513 8.88954 16.3664 10.4676 16.728 11.968C13.9549 11.8247 11.243 11.0998 8.76823 9.84043C6.29346 8.58108 4.11117 6.8154 2.363 4.658C1.46192 6.19488 1.18356 8.01846 1.58508 9.75418C1.98661 11.4899 3.03753 13.006 4.522 13.991C3.417 13.94 2.329 13.651 1.36 13.09V13.175C1.35653 14.7901 1.91405 16.3562 2.93729 17.6058C3.96053 18.8554 5.38596 19.7109 6.97 20.026C5.93906 20.3076 4.85718 20.3483 3.808 20.145C4.25151 21.5313 5.11789 22.744 6.2856 23.6129C7.4533 24.4818 8.86372 24.9634 10.319 24.99C8.87328 26.1262 7.21777 26.9662 5.44716 27.4621C3.67654 27.958 1.82554 28.1 0 27.88C3.19039 29.927 6.90238 31.0129 10.693 31.008"></path>
                                  </svg>
                                </PopoverLink>
                              </div>
                            </div>
                          </Popover.Panel>
                        </Transition>
                      </>
                    )}
                  </Popover>
                </li>
                <li className="">
                  <Link
                    to={routes.jobs()}
                    className="text-orange-700 hover:text-teal-700 no-underline"
                  >
                    Jobs
                  </Link>
                </li>
              </ul>
            </nav>
            <div>
              <div className="flex items-center">
                <div
                  className="ml-8 lg:hidden w-10 p-2"
                  data-action="click->application#toggleNav"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="fill-current text-stone-700"
                  >
                    <path d="M0 0h24v24H0z" fill="none" />
                    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
                  </svg>
                </div>
              </div>
              <ul className="hidden lg:flex items-center">
                {/* <li className="pl-4">
                  <Link
                    to={routes.jobs()}
                    className="bg-teal-500 hover:bg-teal-600 px-3 py-2 text-white hover:text-white text-sm font-semibold rounded no-underline"
                  >
                    Start Tutorial
                  </Link>
                </li> */}
                <li className="ml-4">
                  <a
                    className="block flex no-underline"
                    href="https://github.com/redwoodjs/redwood"
                    title="Go to Redwood's GitHub repo"
                  >
                    <div className="flex items-center pt-[1px] text-xs font-semibold bg-orange-600 text-orange-100 px-2 rounded-l">
                      <span className="icon md-13 mr-1">star</span>11,432
                    </div>
                    <div className="w-3 overflow-hidden inline-block">
                      <div className="h-3 bg-orange-600 rotate-45 transform origin-top-left"></div>
                    </div>
                  </a>
                </li>
                <li className="mr-3">
                  <a
                    className="block w-6"
                    href="https://github.com/redwoodjs/redwood"
                    title="Go to Redwood's GitHub repo"
                  >
                    <svg
                      viewBox="0 0 32 32"
                      className="transition duration-200 fill-current text-orange-400 hover:text-orange-600"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M15.9995 -8.73473e-07C12.198 -0.00275596 8.5196 1.34817 5.62346 3.81077C2.72731 6.27336 0.802616 9.6867 0.194194 13.4393C-0.414229 17.1919 0.333374 21.0385 2.30307 24.29C4.27276 27.5415 7.33584 29.9855 10.9435 31.184C11.7435 31.344 12.0315 30.832 12.0315 30.416L12.0155 27.696C7.56755 28.656 6.62355 25.552 6.62355 25.552C5.88755 23.696 4.84755 23.2 4.84755 23.2C3.40755 22.208 4.95955 22.24 4.95955 22.24C6.55955 22.352 7.40755 23.888 7.40755 23.888C8.84755 26.32 11.1515 25.616 12.0635 25.216C12.2235 24.176 12.6235 23.472 13.0715 23.072C9.51955 22.672 5.79155 21.296 5.79155 15.168C5.79155 13.408 6.41555 11.984 7.43955 10.864C6.95565 9.4866 7.01283 7.97684 7.59955 6.64C7.59955 6.64 8.94355 6.208 11.9995 8.272C14.6192 7.56384 17.3799 7.56384 19.9995 8.272C23.0555 6.192 24.3995 6.64 24.3995 6.64C25.2795 8.832 24.7195 10.48 24.5595 10.864C25.5835 11.984 26.2075 13.424 26.2075 15.168C26.2075 21.312 22.4635 22.656 18.8955 23.056C19.4715 23.552 19.9835 24.528 19.9835 26.016L19.9675 30.416C19.9675 30.832 20.2555 31.344 21.0715 31.184C24.6806 29.985 27.7445 27.5398 29.7141 24.2866C31.6837 21.0334 32.4302 17.185 31.8197 13.4314C31.2092 9.67772 29.2816 6.26427 26.3825 3.80296C23.4835 1.34165 19.8025 -0.00657403 15.9995 -8.73473e-07Z" />
                    </svg>
                  </a>
                </li>
                <li>
                  <Popover className={'relative'}>
                    {(open) => (
                      <>
                        <Popover.Button className={'flex'}>
                          <span className="icon md-28 text-orange-400 hover:text-orange-600 transition duration-150">
                            language
                          </span>
                        </Popover.Button>
                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-200"
                          enterFrom="opacity-0 translate-y-1"
                          enterTo="opacity-100 translate-y-0"
                          leave="transition ease-in duration-150"
                          leaveFrom="opacity-100 translate-y-0"
                          leaveTo="opacity-0 translate-y-1"
                        >
                          <Popover.Panel className="absolute z-10 w-18 max-w-sm px-4 mt-3 transform -translate-x-1/2 left-1/2 sm:px-0 lg:max-w-3xl">
                            <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                              <div className="relative grid gap-8 bg-white p-7 lg:grid-rows-2">
                                {Object.values(Languages).map((ln) => (
                                  <button
                                    key={`Language switch to ${ln}`}
                                    type={'button'}
                                    onClick={() => {
                                      i18n.changeLanguage(ln)
                                    }}
                                  >
                                    {ln}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </Popover.Panel>
                        </Transition>
                      </>
                    )}
                  </Popover>
                </li>
              </ul>
            </div>
          </header>
        </div>
      </section>

      <main className="flex-1 w-full bg-orange-50">{children}</main>

      <footer className="p-6 bg-orange-50 text-orange-700 text-sm border-t border-orange-200">
        Copyright &copy;{new Date().getFullYear()} Tom Preston-Werner
      </footer>
    </>
  )
}

export default MainLayout

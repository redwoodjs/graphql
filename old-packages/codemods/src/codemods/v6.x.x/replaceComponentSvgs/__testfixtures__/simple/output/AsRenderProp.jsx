import React from 'react'
import classNames from 'classnames'

import Button from '../Button/Button'

import Icon from "./BazingaSVG"

const IconButton = ({
  classes = '',
  colours = 'text-white bg-black hover:bg-gray-800',
  children,
}) => {
  const buttonClasses = classNames(
    'transform hover:scale-105',
    classes,
    colours
  )

  return (
    <a
      target="_blank"
      referrerPolicy="origin"
      rel="noreferrer"
    >
      <Button className={buttonClasses} icon={Icon}>
        {children || 'Do something with a beautiful icon button'}
      </Button>
    </a>
  )
}

export default IconButton

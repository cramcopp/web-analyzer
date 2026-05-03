"use client"

import * as React from "react"
import { ResponsiveContainer } from "recharts"

type SafeResponsiveContainerProps = Omit<React.ComponentProps<typeof ResponsiveContainer>, "width" | "height" | "children"> & {
  children: React.ReactElement
  className?: string
  height: number
}

export function SafeResponsiveContainer({
  children,
  className,
  height,
  ...props
}: SafeResponsiveContainerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [width, setWidth] = React.useState(0)

  React.useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const updateWidth = () => {
      const nextWidth = Math.floor(element.getBoundingClientRect().width)
      setWidth(nextWidth > 0 ? nextWidth : 0)
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className={`w-full min-w-0 ${className || ""}`}
      style={{ height, minHeight: height }}
    >
      {width > 0 ? (
        <ResponsiveContainer width={width} height={height} {...props}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  )
}

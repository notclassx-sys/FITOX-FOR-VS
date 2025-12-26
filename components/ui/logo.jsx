"use client"
import React, { useRef, useEffect } from 'react'

export default function Logo({ className }) {
  const imgRef = useRef(null)

  useEffect(() => {
    const el = imgRef.current
    if (!el) return
    const onErr = () => {
      try {
        el.onerror = null
        el.src = '/logo.svg'
      } catch (err) {}
    }
    el.addEventListener('error', onErr)
    return () => el.removeEventListener('error', onErr)
  }, [])

  return <img ref={imgRef} src="/logo.png" alt="FITOX" className={className} />
}

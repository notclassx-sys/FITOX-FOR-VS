"use client"
import React from 'react'

export default function Logo({ className }) {
  const handleError = (e) => {
    try {
      e.currentTarget.onerror = null
      e.currentTarget.src = '/logo.svg'
    } catch (err) {
      // ignore
    }
  }

  return (
    <img src="/logo.png" alt="FITOX" className={className} onError={handleError} />
  )
}

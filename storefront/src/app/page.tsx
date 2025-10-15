"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@lib/components/ui/button"
import { Input } from "@lib/components/ui/input"
import Image from "next/image"

export default function Home() {
  const [email, setEmail] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle email submission here
    console.log("Email submitted:", email)
    setEmail("")
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="max-w-[75vw] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center">
              <Image
                src="/images/logo.svg"
                width={100}
                height={100}
                alt="Anointed Feet black argyle socks in packaging"
                className="w-full max-w-sm h-auto object-contain"
              />
            </div>
          </div>
          <Button
            variant="outline"
            className="text-gray-600 hidden md:block border-gray-300 bg-transparent"
          >
            contact
          </Button>
        </div>
      </header>

      <main
        className="flex-1 bg-cover bg-center bg-no-repeat flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url('/images/bg.png')`,
        }}
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 py-8 md:py-16 max-w-7xl w-full mx-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-6 items-center">
            {/* Product image */}
            <div className="flex justify-center md:order-1">
              <div className="bg-gradient-to-br from-amber-100 to-amber-200 p-4 md:p-6 rounded-2xl shadow-lg transform rotate-3">
                <Image
                  src="/images/sock.svg"
                  width={100}
                  height={100}
                  alt="Anointed Feet black argyle socks in packaging"
                  className="w-full max-w-xs md:max-w-sm h-auto object-contain"
                />
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4 md:space-y-4 md:order-2">
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 leading-tight text-center md:text-left">
                Something Comforting is on the Way
              </h1>

              <p className="text-gray-600 text-base md:text-lg leading-relaxed text-center md:text-left">
                We're almost ready to launch a collection of socks designed for
                comfort, durability and daily inspiration. Be the first to know
                when we go live and enjoy exclusive launch-day offers.
              </p>

              <div className="space-y-4">
                <p className="text-amber-700 font-normal text-center md:text-left">
                  Sign up now and get 15% off when we launch
                </p>

                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col md:flex-row gap-3"
                >
                  <Input
                    type="email"
                    placeholder="Enter your email to be notified"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 px-4 py-3 text-gray-600 placeholder-gray-400 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  <Button
                    type="submit"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3 font-medium w-full md:w-auto"
                  >
                    Notify Me
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

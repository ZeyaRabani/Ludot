import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

export default function Page() {
  return (
    <div className='relative h-screen'>
      <div className='absolute inset-0 z-0 bg-cover bg-center' style={{ backgroundImage: "url('/home/home.png')" }}></div>
      <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10'>
        <Card className='w-[90vw] md:w-[60vw] md:px-6 bg-opacity-50 backdrop-blur-lg font-readex'>
          <CardHeader>
            <CardTitle className='text-4xl md:text-5xl text-center tracking-wider'>Snakes on a chain</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-4 items-center justify-center'>
            <Link href='/snakeAndLadder'>
              <div className='col-span-1 grid place-items-center gap-2'>
                <Image src='/games/snake_and_ladder.webp' alt='room1' width='355' height='755' className='rounded' />
                <Button>Enter game</Button>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

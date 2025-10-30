'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/navbar'
import { getStudySet, getFlashcards, toggleStar, type StudySet, type Flashcard } from '@/lib/supabase-server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function StudySetPage() {
  const router = useRouter()
  const params = useParams()
  const studySetId = params.id as string
  const queryClient = useQueryClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        handleFlipCard()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevCard()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNextCard()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentCardIndex, isFlipped])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/login')
    }
  }

  // Fetch study set
  const { data: studySet } = useQuery({
    queryKey: ['study-set', studySetId],
    queryFn: () => getStudySet(studySetId),
    enabled: !!studySetId,
  })

  // Fetch flashcards with starred status
  const { data: flashcards = [], isLoading } = useQuery({
    queryKey: ['flashcards', studySetId, userId],
    queryFn: () => getFlashcards(studySetId, userId!),
    enabled: !!studySetId && !!userId,
  })

  // Star toggle mutation
  const starMutation = useMutation({
    mutationFn: ({ userId, flashcardId }: { userId: string; flashcardId: string }) =>
      toggleStar(userId, flashcardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards', studySetId, userId] })
    },
  })

  const handleFlipCard = () => {
    setIsFlipped(!isFlipped)
  }

  const handleNextCard = () => {
    if (flashcards.length === 0) return
    setIsFlipped(false)
    setCurrentCardIndex((prev) => (prev + 1) % flashcards.length)
  }

  const handlePrevCard = () => {
    if (flashcards.length === 0) return
    setIsFlipped(false)
    setCurrentCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length)
  }

  const handleBackToDashboard = () => {
    router.push('/dashboard')
  }

  const handleToggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!userId || !currentCard) return

    try {
      await starMutation.mutateAsync({
        userId,
        flashcardId: currentCard.id,
      })
    } catch (error) {
      console.error('Error toggling star:', error)
    }
  }

  if (isLoading || !userId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-600 dark:text-gray-400">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!studySet) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center py-12">
            <CardContent>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Study set not found
              </h3>
              <Button onClick={handleBackToDashboard} className="mt-4">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (flashcards.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="ghost"
            onClick={handleBackToDashboard}
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No flashcards yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Add some flashcards to start studying!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const currentCard = flashcards[currentCardIndex]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBackToDashboard}
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {studySet.title}
          </h1>
          {studySet.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {studySet.description}
            </p>
          )}
        </div>

        {/* Progress */}
        <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">
          Card {currentCardIndex + 1} of {flashcards.length}
        </div>

        {/* Flashcard with 3D Flip */}
        <div className="perspective-1000 mb-8">
          <div
            className={`relative w-full h-[400px] transition-transform duration-500 transform-style-3d cursor-pointer ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
            onClick={handleFlipCard}
          >
            {/* Front of card (Term) */}
            <Card
              className={`absolute inset-0 backface-hidden ${
                isFlipped ? 'invisible' : 'visible'
              }`}
            >
              <CardContent className="flex flex-col items-center justify-center h-full p-8 relative">
                <button
                  onClick={handleToggleStar}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  aria-label="Toggle star"
                >
                  <svg
                    className={`w-6 h-6 ${
                      currentCard.is_starred
                        ? 'fill-yellow-400 stroke-yellow-400'
                        : 'fill-none stroke-gray-400'
                    }`}
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                    />
                  </svg>
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wide">
                  Term
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                  {currentCard.term}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-8">
                  Click to flip • Space/Enter
                </p>
              </CardContent>
            </Card>

            {/* Back of card (Definition) */}
            <Card
              className={`absolute inset-0 backface-hidden rotate-y-180 ${
                isFlipped ? 'visible' : 'invisible'
              }`}
            >
              <CardContent className="flex flex-col items-center justify-center h-full p-8 relative bg-blue-50 dark:bg-blue-950">
                <button
                  onClick={handleToggleStar}
                  className="absolute top-4 right-4 p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-full transition-colors"
                  aria-label="Toggle star"
                >
                  <svg
                    className={`w-6 h-6 ${
                      currentCard.is_starred
                        ? 'fill-yellow-400 stroke-yellow-400'
                        : 'fill-none stroke-gray-400'
                    }`}
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                    />
                  </svg>
                </button>
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-4 uppercase tracking-wide">
                  Definition
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white text-center">
                  {currentCard.definition}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-8">
                  Click to flip • Space/Enter
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevCard}
            disabled={flashcards.length <= 1}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
            <span className="text-xs text-gray-500">(←)</span>
          </Button>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Use arrow keys to navigate
          </div>

          <Button
            variant="outline"
            onClick={handleNextCard}
            disabled={flashcards.length <= 1}
            className="flex items-center gap-2"
          >
            <span className="text-xs text-gray-500">(→)</span>
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  )
}

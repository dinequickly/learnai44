import { createClient } from '@supabase/supabase-js'

// Create a Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types
export interface StudySet {
  id: string
  user_id: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
  flashcard_count?: number
}

export interface Flashcard {
  id: string
  study_set_id: string
  term: string
  definition: string
  position: number
  created_at: string
  is_starred?: boolean
}

/**
 * Get all study sets for a specific user
 * @param userId - The user's ID
 * @returns Array of study sets with flashcard counts
 */
export async function getStudySets(userId: string): Promise<StudySet[]> {
  try {
    const { data: studySets, error } = await supabase
      .from('study_sets')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Get flashcard counts for each study set
    const studySetsWithCounts = await Promise.all(
      (studySets || []).map(async (set) => {
        const { count } = await supabase
          .from('flashcards')
          .select('*', { count: 'exact', head: true })
          .eq('study_set_id', set.id)

        return {
          ...set,
          flashcard_count: count || 0,
        }
      })
    )

    return studySetsWithCounts
  } catch (error) {
    console.error('Error fetching study sets:', error)
    return []
  }
}

/**
 * Get a single study set by ID
 * @param studySetId - The study set's ID
 * @returns Study set with flashcard count or null
 */
export async function getStudySet(studySetId: string): Promise<StudySet | null> {
  try {
    const { data: studySet, error } = await supabase
      .from('study_sets')
      .select('*')
      .eq('id', studySetId)
      .single()

    if (error) throw error

    // Get flashcard count
    const { count } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('study_set_id', studySet.id)

    return {
      ...studySet,
      flashcard_count: count || 0,
    }
  } catch (error) {
    console.error('Error fetching study set:', error)
    return null
  }
}

/**
 * Get all flashcards for a specific study set
 * @param studySetId - The study set's ID
 * @param userId - Optional user ID to check starred status
 * @returns Array of flashcards ordered by position
 */
export async function getFlashcards(studySetId: string, userId?: string): Promise<Flashcard[]> {
  try {
    const { data: flashcards, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('study_set_id', studySetId)
      .order('position', { ascending: true })

    if (error) throw error

    // If userId provided, check which cards are starred
    if (userId && flashcards) {
      const { data: starredCards } = await supabase
        .from('starred_flashcards')
        .select('flashcard_id')
        .eq('user_id', userId)

      const starredIds = new Set(starredCards?.map(s => s.flashcard_id) || [])

      return flashcards.map(card => ({
        ...card,
        is_starred: starredIds.has(card.id)
      }))
    }

    return flashcards || []
  } catch (error) {
    console.error('Error fetching flashcards:', error)
    return []
  }
}

/**
 * Create a new study set
 * @param userId - The user's ID
 * @param title - Study set title
 * @param description - Optional description
 * @returns The created study set or null
 */
export async function createStudySet(
  userId: string,
  title: string,
  description?: string
): Promise<StudySet | null> {
  try {
    const { data, error } = await supabase
      .from('study_sets')
      .insert({
        user_id: userId,
        title,
        description: description || null,
      })
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error creating study set:', error)
    return null
  }
}

/**
 * Delete a study set and all its flashcards
 * @param studySetId - The study set's ID
 * @returns Success boolean
 */
export async function deleteStudySet(studySetId: string): Promise<boolean> {
  try {
    // Delete flashcards first (if not using cascade)
    await supabase.from('flashcards').delete().eq('study_set_id', studySetId)

    // Delete study set
    const { error } = await supabase
      .from('study_sets')
      .delete()
      .eq('id', studySetId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error deleting study set:', error)
    return false
  }
}

/**
 * Toggle star/favorite status for a flashcard
 * @param userId - The user's ID
 * @param flashcardId - The flashcard's ID
 * @returns Updated starred status (true if now starred, false if unstarred)
 */
export async function toggleStar(userId: string, flashcardId: string): Promise<boolean> {
  try {
    // Check if already starred
    const { data: existing } = await supabase
      .from('starred_flashcards')
      .select('*')
      .eq('user_id', userId)
      .eq('flashcard_id', flashcardId)
      .single()

    if (existing) {
      // Unstar - delete the record
      const { error } = await supabase
        .from('starred_flashcards')
        .delete()
        .eq('user_id', userId)
        .eq('flashcard_id', flashcardId)

      if (error) throw error
      return false
    } else {
      // Star - insert new record
      const { error } = await supabase
        .from('starred_flashcards')
        .insert({ user_id: userId, flashcard_id: flashcardId })

      if (error) throw error
      return true
    }
  } catch (error) {
    console.error('Error toggling star:', error)
    throw error
  }
}

/**
 * Get configured Supabase client
 * @returns Supabase client instance
 */
export function getSupabaseClient() {
  return supabase
}

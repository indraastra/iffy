import { createRouter, createWebHistory } from 'vue-router'
import GameLayout from '@/components/GameLayout.vue'
import ChoiceDrivenTest from '@/components/ChoiceDrivenTest.vue'
import { getStoryMetadataBySlug } from '@/examples-metadata'
import { isValidStorySlug } from '@/utils/storySlug'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: GameLayout,
      meta: {
        title: 'Iffy - Interactive Fiction Engine'
      }
    },
    {
      path: '/choice-driven',
      name: 'choice-driven',
      component: ChoiceDrivenTest,
      meta: {
        title: 'Choice-Driven Engine MVP'
      }
    },
    {
      path: '/stories/:storySlug',
      name: 'story',
      component: GameLayout,
      meta: {
        title: 'Iffy - Loading Story...'
      },
      beforeEnter: (to, _from, next) => {
        const storySlug = to.params.storySlug as string
        
        // Validate slug format
        if (!isValidStorySlug(storySlug)) {
          next({ name: 'not-found' })
          return
        }
        
        // Check if story exists
        const storyMeta = getStoryMetadataBySlug(storySlug)
        if (!storyMeta) {
          next({ name: 'not-found' })
          return
        }
        
        // Update page title
        to.meta.title = `Iffy - ${storyMeta.title}`
        next()
      }
    },
    {
      path: '/404',
      name: 'not-found',
      component: GameLayout,
      meta: {
        title: 'Iffy - Story Not Found',
        isNotFound: true
      }
    },
    {
      // Catch-all route for undefined paths
      path: '/:pathMatch(.*)*',
      redirect: { name: 'not-found' }
    }
  ]
})

// Update document title on route changes
router.afterEach((to) => {
  if (to.meta.title) {
    document.title = to.meta.title as string
  }
})

export default router
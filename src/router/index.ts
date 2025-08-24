import { createRouter, createWebHashHistory } from 'vue-router'
import GameLayout from '@/components/GameLayout.vue'
import EmergentInterface from '@/components/EmergentInterface.vue'
import { getStoryMetadataBySlug } from '@/examples-metadata'
import { isValidStorySlug } from '@/utils/storySlug'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
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
      path: '/emergent',
      name: 'emergent',
      component: EmergentInterface,
      meta: {
        title: 'Emergent Narrative Engine'
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
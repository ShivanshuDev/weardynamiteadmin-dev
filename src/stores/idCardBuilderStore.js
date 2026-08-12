import { defineStore } from 'pinia'
import api from '../utils/api'

export const useIdCardBuilderStore = defineStore('idCardBuilder', {
  state: () => ({
    templates: [],
    template: {
      id: null,
      name: 'New Template',
      isActive: false,
      backgroundUrl: '',
      elements: []
    },
    loading: false
  }),

  actions: {
    async fetchTemplates(schoolId = 'shaheed_inter_college') {
      this.loading = true
      try {
        const res = await api.get(`/id-cards/templates?schoolId=${schoolId}`)
        this.templates = res.data
      } catch (err) {
        console.error(err)
      } finally {
        this.loading = false
      }
    },
    
    async saveTemplate(schoolId = 'shaheed_inter_college') {
      this.loading = true
      try {
        const payload = {
          name: this.template.name,
          isActive: this.template.isActive,
          backgroundUrl: this.template.backgroundUrl,
          elements: this.template.elements
        }
        
        let res;
        if (this.template.id) {
          res = await api.put(`/id-cards/templates/${this.template.id}?schoolId=${schoolId}`, payload)
        } else {
          res = await api.post(`/id-cards/templates?schoolId=${schoolId}`, payload)
          this.template.id = res.data.templateId
        }
        
        await this.fetchTemplates(schoolId)
        return res.data
      } catch (err) {
        console.error(err)
        throw err
      } finally {
        this.loading = false
      }
    },

    setTemplate(template) {
      this.template = JSON.parse(JSON.stringify(template))
    }
  }
})

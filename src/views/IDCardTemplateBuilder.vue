<template>
  <div class="h-screen flex flex-col bg-[#F3F4F6] overflow-hidden font-sans text-slate-800">
    
    <!-- Top Navbar -->
    <header class="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-20">
      <div class="flex items-center gap-3">
        <router-link to="/id-cards" class="p-2 hover:bg-slate-100 rounded-md text-slate-500 transition-colors">
          <ArrowLeft size="18" />
        </router-link>
        <div class="w-px h-6 bg-slate-200 mx-1"></div>
        <input 
          v-model="builderStore.template.name" 
          type="text" 
          class="px-2 py-1 bg-transparent hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all w-64" 
          placeholder="Untitled Design" 
        />
      </div>
      
      <div class="flex items-center gap-4">
        <div class="flex items-center bg-slate-100 rounded-lg p-1 mr-4">
          <button @click="undo" :disabled="!canUndo" class="p-1.5 rounded hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"><Undo2 size="16" /></button>
          <button @click="redo" :disabled="!canRedo" class="p-1.5 rounded hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"><Redo2 size="16" /></button>
        </div>

        <button @click="exportPdf" class="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
          Download PDF
        </button>
        <button @click="saveTemplate" class="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-colors flex items-center gap-2">
          <Save size="14" />
          Save Template
        </button>
      </div>
    </header>

    <!-- Contextual Toolbar (Properties) - Simplified for normal users -->
    <div class="h-12 bg-white border-b border-slate-200 flex items-center px-4 shrink-0 z-10 overflow-x-auto gap-4 shadow-sm" v-if="selectedElement">
      
      <!-- Text Properties -->
      <template v-if="isTextElement(selectedElement)">
        <select v-model="selectedElement.fontFamily" class="h-8 border border-slate-200 rounded px-2 text-xs font-medium outline-none focus:border-indigo-500 min-w-[120px]">
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
        </select>
        <div class="w-px h-5 bg-slate-200"></div>
        <div class="flex items-center border border-slate-200 rounded h-8 overflow-hidden">
          <button @click="selectedElement.fontSize = Math.max(8, selectedElement.fontSize - 1)" class="px-2 hover:bg-slate-100 h-full border-r border-slate-200"><Minus size="14"/></button>
          <input v-model.number="selectedElement.fontSize" type="number" class="w-12 h-full text-center text-xs font-medium outline-none hide-arrows" />
          <button @click="selectedElement.fontSize += 1" class="px-2 hover:bg-slate-100 h-full border-l border-slate-200"><Plus size="14"/></button>
        </div>
        <div class="w-px h-5 bg-slate-200"></div>
        <input type="color" v-model="selectedElement.fill" class="w-8 h-8 rounded cursor-pointer p-0 border-0" />
        <div class="w-px h-5 bg-slate-200"></div>
        <div class="flex items-center gap-1">
          <button @click="toggleBold" class="p-1.5 rounded hover:bg-slate-100" :class="{'bg-slate-200': selectedElement.bold}"><Bold size="16" /></button>
          <button @click="toggleItalic" class="p-1.5 rounded hover:bg-slate-100" :class="{'bg-slate-200': selectedElement.italic}"><Italic size="16" /></button>
          <button @click="toggleUnderline" class="p-1.5 rounded hover:bg-slate-100" :class="{'bg-slate-200': selectedElement.underline}"><UnderlineIcon size="16" /></button>
        </div>
        <div class="w-px h-5 bg-slate-200"></div>
        <div class="flex items-center gap-1">
          <button @click="selectedElement.align = 'left'" class="p-1.5 rounded hover:bg-slate-100" :class="{'bg-slate-200': selectedElement.align === 'left'}"><AlignLeft size="16" /></button>
          <button @click="selectedElement.align = 'center'" class="p-1.5 rounded hover:bg-slate-100" :class="{'bg-slate-200': selectedElement.align === 'center'}"><AlignCenter size="16" /></button>
          <button @click="selectedElement.align = 'right'" class="p-1.5 rounded hover:bg-slate-100" :class="{'bg-slate-200': selectedElement.align === 'right'}"><AlignRight size="16" /></button>
        </div>
      </template>

      <!-- Dynamic Field Properties (Simplified) -->
      <template v-if="isDynamicField(selectedElement)">
        <div class="flex items-center gap-2 bg-slate-100 p-1 rounded-md text-[10px] font-bold">
          <button @click="dynamicFieldTab = 'label'" class="px-2 py-1 rounded" :class="{'bg-white shadow-sm text-indigo-600': dynamicFieldTab === 'label', 'text-slate-500 hover:text-slate-700': dynamicFieldTab !== 'label'}">LABEL</button>
          <button @click="dynamicFieldTab = 'value'" class="px-2 py-1 rounded" :class="{'bg-white shadow-sm text-indigo-600': dynamicFieldTab === 'value', 'text-slate-500 hover:text-slate-700': dynamicFieldTab !== 'value'}">VALUE</button>
        </div>
        <div class="w-px h-5 bg-slate-200"></div>
        <select v-model="activeDynamicPart.fontFamily" class="h-8 border border-slate-200 rounded px-2 text-xs font-medium outline-none focus:border-indigo-500 min-w-[120px]">
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
        </select>
        <div class="w-px h-5 bg-slate-200"></div>
        <div class="flex items-center border border-slate-200 rounded h-8 overflow-hidden">
          <button @click="activeDynamicPart.fontSize = Math.max(8, activeDynamicPart.fontSize - 1)" class="px-2 hover:bg-slate-100 h-full border-r border-slate-200"><Minus size="14"/></button>
          <input v-model.number="activeDynamicPart.fontSize" type="number" class="w-12 h-full text-center text-xs font-medium outline-none hide-arrows" />
          <button @click="activeDynamicPart.fontSize += 1" class="px-2 hover:bg-slate-100 h-full border-l border-slate-200"><Plus size="14"/></button>
        </div>
        <div class="w-px h-5 bg-slate-200"></div>
        <input type="color" v-model="activeDynamicPart.fill" class="w-8 h-8 rounded cursor-pointer p-0 border-0" />
        <div class="w-px h-5 bg-slate-200"></div>
        <div class="flex items-center gap-1">
          <button @click="toggleDynamicBold" class="p-1.5 rounded hover:bg-slate-100" :class="{'bg-slate-200': activeDynamicPart.bold}"><Bold size="16" /></button>
          <button @click="toggleDynamicItalic" class="p-1.5 rounded hover:bg-slate-100" :class="{'bg-slate-200': activeDynamicPart.italic}"><Italic size="16" /></button>
          <button @click="toggleDynamicUnderline" class="p-1.5 rounded hover:bg-slate-100" :class="{'bg-slate-200': activeDynamicPart.underline}"><UnderlineIcon size="16" /></button>
        </div>
      </template>
      
      <!-- Image Properties (Only show in Advanced or basic replacement) -->
      <template v-if="isImageElement(selectedElement)">
        <button class="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-medium">
          <Upload size="14" /> Replace Image
        </button>
      </template>

      <div class="flex-1"></div>
      
      <div class="flex items-center gap-2">
        <button @click="duplicateElement" class="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Duplicate"><Copy size="16" /></button>
        <button @click="deleteSelected" class="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete"><Trash2 size="16" /></button>
      </div>

    </div>
    <div v-else class="h-12 bg-slate-50 border-b border-slate-200 flex items-center justify-center px-4 shrink-0 z-10 text-xs font-medium text-slate-400 italic">
      Select an element to edit properties
    </div>

    <!-- Main Editor Area -->
    <div class="flex-1 flex overflow-hidden">
      
      <!-- Left Panel: Guided Wizard -->
      <div class="w-80 bg-white border-r border-slate-200 shadow-xl z-20 flex flex-col overflow-hidden relative">
        <div class="p-4 border-b border-slate-100 bg-slate-50">
          <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Wand2 size="16" class="text-indigo-600" /> Card Setup
          </h2>
          <p class="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">Follow steps to auto-generate</p>
        </div>
        
        <div class="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-8">
          
          <!-- Step 1: Branding -->
          <div class="space-y-4">
            <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">1. School Branding</h3>
            
            <div>
              <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Card Background</label>
              <div class="space-y-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                <div class="flex flex-wrap gap-2">
                  <div v-for="(color, index) in wizard.bgColors" :key="index" class="relative group">
                    <input type="color" v-model="wizard.bgColors[index]" class="w-8 h-8 rounded cursor-pointer p-0 border-0 shadow-sm" />
                    <button v-if="wizard.bgColors.length > 1" @click="wizard.bgColors.splice(index, 1)" class="absolute -top-2 -right-2 bg-white text-red-500 rounded-full shadow hover:bg-red-50 hidden group-hover:block"><Minus size="12" /></button>
                  </div>
                  <button @click="wizard.bgColors.push('#ffffff')" class="w-8 h-8 rounded border border-dashed border-slate-400 text-slate-400 flex items-center justify-center hover:bg-slate-100 hover:text-slate-600 transition-colors">
                    <Plus size="16" />
                  </button>
                </div>
                <div v-if="wizard.bgColors.length > 1" class="pt-2 border-t border-slate-200">
                   <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Gradient Angle ({{wizard.bgAngle}}°)</label>
                   <input type="range" v-model.number="wizard.bgAngle" min="0" max="360" class="w-full" />
                </div>
              </div>
            </div>

            <div>
              <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">School Name</label>
              <input type="text" v-model="wizard.schoolName" placeholder="e.g. ABC Public School" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Subtitle / Affiliation</label>
              <input type="text" v-model="wizard.subtitle" placeholder="e.g. Affiliated to CBSE" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500" />
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
               <label class="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                 <input type="checkbox" v-model="wizard.includeLogo" class="rounded text-indigo-600 focus:ring-indigo-500" />
                 Include Logo
               </label>
               <label class="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                 <input type="checkbox" v-model="wizard.includePhoto" class="rounded text-indigo-600 focus:ring-indigo-500" />
                 Student Photo
               </label>
            </div>
          </div>

          <!-- Step 2: Student Fields -->
          <div class="space-y-3">
            <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center justify-between">
              2. Student Data
              <span class="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">{{ wizard.fields.length }} Selected</span>
            </h3>
            
            <div class="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto custom-scrollbar p-1">
              <label v-for="field in predefinedFields" :key="field.label" class="flex items-center gap-2 p-2 rounded border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                <input type="checkbox" :value="field" v-model="wizard.fields" class="rounded text-indigo-600 focus:ring-indigo-500" />
                <span class="text-[11px] font-bold text-slate-700 truncate">{{ field.label }}</span>
              </label>
            </div>
          </div>
          
        </div>

        <!-- Step 3: Action -->
        <div class="p-4 border-t border-slate-200 bg-slate-50">
           <button @click="autoGenerateLayout" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2">
             <LayoutTemplate size="16" />
             Generate Layout
           </button>
           <p class="text-[9px] text-slate-400 text-center font-bold uppercase tracking-wider mt-3">Warning: This overrides manual positioning</p>
        </div>
      </div>

      <!-- Center Canvas Workspace -->
      <main class="flex-1 flex flex-col relative overflow-hidden pattern-bg">
        
        <div class="flex-1 overflow-auto relative flex items-center justify-center p-8 custom-scrollbar">
          
          <div 
            class="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative border border-slate-200 rounded-[3mm] overflow-hidden transition-transform origin-center"
            :style="{ 
              width: `${CR80_WIDTH * zoomLevel}px`, 
              height: `${CR80_HEIGHT * zoomLevel}px`,
            }"
            @click.self="clearSelection"
          >
             <div v-if="advancedMode && showGrid" class="absolute inset-0 pointer-events-none" :style="{
               backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
               backgroundSize: `${20 * zoomLevel}px ${20 * zoomLevel}px`
             }"></div>

            <!-- Konva Stage -->
            <v-stage ref="stageRef" :config="{ width: CR80_WIDTH * zoomLevel, height: CR80_HEIGHT * zoomLevel }" @mousedown="handleStageMouseDown" @touchstart="handleStageMouseDown">
              <v-layer>
                <template v-for="item in builderStore.template.elements" :key="item.id">
                  
                  <v-text 
                    v-if="item.type === 'text'" 
                    :config="{ 
                      x: item.x * zoomLevel, 
                      y: item.y * zoomLevel, 
                      text: item.text || item.name, 
                      fontSize: (item.fontSize || 20) * zoomLevel, 
                      fontFamily: item.fontFamily || 'Arial',
                      fill: item.fill || '#000000',
                      fontStyle: `${item.italic ? 'italic ' : ''}${item.bold ? 'bold' : 'normal'}`,
                      textDecoration: item.underline ? 'underline' : '',
                      align: item.align || 'left',
                      draggable: !item.locked,
                      name: item.id,
                      opacity: item.opacity || 1,
                      visible: !item.hidden,
                      width: item.width ? item.width * zoomLevel : undefined
                    }" 
                    @dragend="handleDragEnd"
                    @transformend="handleTransformEnd"
                  />
                  
                  <v-rect 
                    v-else-if="item.type === 'image'" 
                    :config="{ 
                      x: item.x * zoomLevel, 
                      y: item.y * zoomLevel, 
                      width: (item.width || 100) * zoomLevel, 
                      height: (item.height || 100) * zoomLevel, 
                      fill: item.fill || '#cbd5e1', 
                      draggable: !item.locked,
                      name: item.id,
                      opacity: item.opacity || 1,
                      visible: !item.hidden,
                      cornerRadius: item.rounded ? 999 : 0
                    }" 
                    @dragend="handleDragEnd"
                    @transformend="handleTransformEnd"
                  />

                  <!-- Gradient Background -->
                  <v-rect 
                    v-else-if="item.type === 'rect_gradient'" 
                    :config="{ 
                      x: item.x * zoomLevel, 
                      y: item.y * zoomLevel, 
                      width: (item.width || 100) * zoomLevel, 
                      height: (item.height || 100) * zoomLevel, 
                      fillLinearGradientStartPoint: { x: item.fillLinearGradientStartPoint.x * zoomLevel, y: item.fillLinearGradientStartPoint.y * zoomLevel },
                      fillLinearGradientEndPoint: { x: item.fillLinearGradientEndPoint.x * zoomLevel, y: item.fillLinearGradientEndPoint.y * zoomLevel },
                      fillLinearGradientColorStops: item.fillLinearGradientColorStops,
                      draggable: !item.locked,
                      name: item.id,
                      opacity: item.opacity || 1,
                      visible: !item.hidden
                    }" 
                  />

                  <v-group
                    v-else-if="item.type === 'dynamic_field'"
                    :config="{
                      x: item.x * zoomLevel,
                      y: item.y * zoomLevel,
                      draggable: !item.locked,
                      name: item.id,
                      opacity: item.opacity || 1,
                      visible: !item.hidden
                    }"
                    @dragend="handleDragEnd"
                  >
                    <!-- Label part -->
                    <v-text 
                      v-if="item.displayMode !== 'value'"
                      :config="{
                        x: 0,
                        y: 0,
                        text: item.label.text + (item.layout === 'horizontal' ? ':' : ''),
                        fontSize: item.label.fontSize * zoomLevel,
                        fontFamily: item.label.fontFamily || 'Arial',
                        fill: item.label.fill || '#666666',
                        fontStyle: `${item.label.italic ? 'italic ' : ''}${item.label.bold ? 'bold' : 'normal'}`,
                        textDecoration: item.label.underline ? 'underline' : ''
                      }"
                    />
                    <!-- Value part -->
                    <v-text 
                      v-if="item.displayMode !== 'label'"
                      :config="{
                        x: (item.layout === 'horizontal' && item.displayMode !== 'value') ? (getTextWidth(item.label.text + ':', item.label) + item.spacing) * zoomLevel : 0,
                        y: (item.layout === 'vertical' && item.displayMode !== 'value') ? (item.label.fontSize + item.spacing) * zoomLevel : 0,
                        text: item.value.text,
                        fontSize: item.value.fontSize * zoomLevel,
                        fontFamily: item.value.fontFamily || 'Arial',
                        fill: item.value.fill || '#000000',
                        fontStyle: `${item.value.italic ? 'italic ' : ''}${item.value.bold ? 'bold' : 'normal'}`,
                        textDecoration: item.value.underline ? 'underline' : ''
                      }"
                    />
                  </v-group>

                </template>

                <v-transformer 
                  ref="transformerRef" 
                  :config="{
                    anchorStroke: '#3b82f6',
                    anchorFill: '#ffffff',
                    anchorSize: 8,
                    borderStroke: '#3b82f6',
                    borderDash: [3, 3],
                    rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
                    padding: 2
                  }"
                />
              </v-layer>
            </v-stage>
          </div>
        </div>

        <div class="absolute bottom-6 right-6 flex items-center gap-4 bg-white rounded-xl shadow-lg border border-slate-200 px-3 py-2 z-20">
          <div class="flex items-center gap-2">
            <button @click="zoomLevel = Math.max(0.2, zoomLevel - 0.1)" class="p-1 hover:bg-slate-100 rounded text-slate-600"><ZoomOut size="16" /></button>
            <span class="text-xs font-bold text-slate-600 w-12 text-center">{{ Math.round(zoomLevel * 100) }}%</span>
            <button @click="zoomLevel = Math.min(3, zoomLevel + 0.1)" class="p-1 hover:bg-slate-100 rounded text-slate-600"><ZoomIn size="16" /></button>
          </div>
        </div>
      </main>

      <!-- Right Panel: Properties (Hides complexities from normal users) -->
      <aside class="w-72 bg-white border-l border-slate-200 flex flex-col shrink-0 z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
        
        <div class="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 class="text-xs font-black text-slate-800 uppercase tracking-widest">Configuration</h2>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest" :class="{'text-indigo-600': advancedMode}">Advanced Mode</span>
            <div class="relative inline-block w-8 h-4 transition duration-200 ease-linear rounded-full" :class="advancedMode ? 'bg-indigo-500' : 'bg-slate-200'">
              <input type="checkbox" v-model="advancedMode" class="absolute w-0 h-0 opacity-0" />
              <span class="absolute left-0.5 top-0.5 w-3 h-3 bg-white border-2 border-white rounded-full transition-transform duration-200 ease-linear shadow-sm" :class="advancedMode ? 'transform translate-x-4' : ''"></span>
            </div>
          </label>
        </div>

        <div v-if="selectedElement" class="p-4 border-b border-slate-100 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
          
          <template v-if="isDynamicField(selectedElement)">
            <div class="space-y-3">
              <div>
                <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Label Text</label>
                <input type="text" v-model="selectedElement.label.text" class="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:border-indigo-500" />
              </div>
              <div v-if="advancedMode">
                <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Value Formula (Advanced)</label>
                <input type="text" v-model="selectedElement.value.text" class="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono outline-none focus:border-indigo-500" />
              </div>
              
              <div class="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Layout</label>
                  <select v-model="selectedElement.layout" class="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:border-indigo-500">
                    <option value="horizontal">Side by Side</option>
                    <option value="vertical">Stacked</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Display</label>
                  <select v-model="selectedElement.displayMode" class="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:border-indigo-500">
                    <option value="both">Label & Value</option>
                    <option value="label">Label Only</option>
                    <option value="value">Value Only</option>
                  </select>
                </div>
              </div>
            </div>
          </template>

          <div v-else-if="isTextElement(selectedElement)">
             <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Text Content</label>
             <textarea v-model="selectedElement.text" class="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:border-indigo-500 min-h-[60px]" />
          </div>

          <!-- Advanced Mode: Coordinates & Layers -->
          <div v-if="advancedMode" class="pt-4 mt-4 border-t border-slate-100">
            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Technical Attributes</h3>
            <div class="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1"><Move size="10"/> X (px)</label>
                <input type="number" v-model.number="selectedElement.x" class="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1"><Move size="10"/> Y (px)</label>
                <input type="number" v-model.number="selectedElement.y" class="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:border-indigo-500" />
              </div>
              <div v-if="!isDynamicField(selectedElement)">
                <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1"><Maximize size="10"/> W (px)</label>
                <input type="number" v-model.number="selectedElement.width" class="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:border-indigo-500" />
              </div>
              <div v-if="isImageElement(selectedElement)">
                <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1"><Maximize size="10"/> H (px)</label>
                <input type="number" v-model.number="selectedElement.height" class="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:border-indigo-500" />
              </div>
            </div>

            <!-- Layer List (Only in Advanced) -->
            <div>
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Layers (Z-Index)</label>
              <div class="space-y-1">
                <div 
                  v-for="(element, index) in [...builderStore.template.elements].reverse()" 
                  :key="element.id"
                  class="flex items-center justify-between p-2 rounded border border-slate-100 bg-slate-50 group"
                  :class="selectedElement?.id === element.id ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'text-slate-600'"
                >
                  <span class="text-[10px] font-bold truncate w-24">{{ element.name }}</span>
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button @click.stop="moveLayerUp(element.id)" class="p-1 hover:bg-slate-200 rounded text-slate-500"><ChevronUp size="10"/></button>
                    <button @click.stop="moveLayerDown(element.id)" class="p-1 hover:bg-slate-200 rounded text-slate-500"><ChevronDown size="10"/></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
        <div v-else class="p-6 text-center text-slate-400 text-xs font-medium border-b border-slate-100 flex-1 flex flex-col items-center justify-center">
          <MousePointer2 size="24" class="opacity-20 mb-2" />
          Click an element on the card to configure
        </div>

      </aside>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  ArrowLeft, Save, ZoomIn, ZoomOut, Type, Image, Database,
  QrCode, Move, Maximize, MousePointer2, Trash2, Undo2, Redo2,
  Copy, Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
  Minus, Plus, Droplet, Upload, Wand2, LayoutTemplate,
  Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown
} from 'lucide-vue-next'
import { jsPDF } from 'jspdf'

const router = useRouter()
const stageRef = ref(null)
const transformerRef = ref(null)

// UI State
const advancedMode = ref(false)
const showGrid = ref(false)
const dynamicFieldTab = ref('value') 

// Wizard State
const wizard = ref({
  schoolName: '',
  subtitle: '',
  includeLogo: true,
  includePhoto: true,
  fields: [],
  bgColors: ['#ffffff'],
  bgAngle: 180
})

const predefinedFields = [
  { label: 'Student Name', formula: '{{student_name}}' },
  { label: 'Class', formula: '{{class}}' },
  { label: 'Section', formula: '{{section}}' },
  { label: 'Father Name', formula: '{{father_name}}' },
  { label: 'DOB', formula: '{{dob}}' },
  { label: 'Mobile', formula: '{{mobile}}' },
  { label: 'Address', formula: '{{address}}' },
  { label: 'Blood Group', formula: '{{blood_group}}' },
  { label: 'Roll No', formula: '{{roll_no}}' }
]

// Default pre-select some standard fields
wizard.value.fields = [predefinedFields[0], predefinedFields[1], predefinedFields[8], predefinedFields[4]]

// History tracking
const history = ref([])
const historyIndex = ref(-1)
const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < history.value.length - 1)

const CR80_WIDTH = 648
const CR80_HEIGHT = 1027
const zoomLevel = ref(0.4) 

const getTextWidth = (text, config) => {
  if (!text) return 0;
  const avgCharWidth = (config.fontSize || 12) * 0.55; 
  let width = text.length * avgCharWidth;
  if (config.bold) width *= 1.1;
  return Math.round(width);
}

const builderStore = ref({
  template: { name: '', elements: [] }
})

const selectedElementId = ref(null)
const selectedElement = computed(() => builderStore.value.template.elements.find(e => e.id === selectedElementId.value))

const isTextElement = (el) => el && el.type === 'text'
const isImageElement = (el) => el && el.type === 'image'
const isDynamicField = (el) => el && el.type === 'dynamic_field'

const activeDynamicPart = computed(() => {
  if (!selectedElement.value) return null;
  return dynamicFieldTab.value === 'label' ? selectedElement.value.label : selectedElement.value.value;
})

const saveHistory = () => {
  const state = JSON.stringify(builderStore.value.template.elements)
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }
  history.value.push(state)
  historyIndex.value = history.value.length - 1
}

const undo = () => {
  if (canUndo.value) {
    historyIndex.value--
    builderStore.value.template.elements = JSON.parse(history.value[historyIndex.value])
    selectedElementId.value = null
    updateTransformer()
  }
}

const redo = () => {
  if (canRedo.value) {
    historyIndex.value++
    builderStore.value.template.elements = JSON.parse(history.value[historyIndex.value])
    selectedElementId.value = null
    updateTransformer()
  }
}

onMounted(() => {
  saveHistory()
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})

const handleGlobalKeydown = (e) => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId.value && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
    deleteSelected()
  }
  if (e.ctrlKey && e.key === 'z') { undo() }
  if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) { redo() }
}

const selectElement = (el) => {
  if (el.locked) return
  selectedElementId.value = el.id
  updateTransformer()
}

const clearSelection = () => {
  selectedElementId.value = null
  updateTransformer()
}

const handleStageMouseDown = (e) => {
  if (e.target === e.target.getStage() || e.target.hasName('bg')) {
    clearSelection()
    return
  }
  let id = e.target.name()
  if (!id && e.target.parent) id = e.target.parent.name() 
  const el = builderStore.value.template.elements.find(e => e.id === id)
  if (el && !el.locked) {
    selectedElementId.value = id
    updateTransformer()
  }
}

const updateTransformer = () => {
  nextTick(() => {
    const transformerNode = transformerRef.value?.getNode()
    const stage = transformerNode?.getStage()
    if (!transformerNode || !stage) return

    if (!selectedElementId.value) {
      transformerNode.nodes([])
      return
    }
    const selectedNode = stage.findOne(`.${selectedElementId.value}`)
    if (selectedNode) {
      transformerNode.nodes([selectedNode])
    } else {
      transformerNode.nodes([])
    }
  })
}

const handleDragEnd = (e) => {
  let id = e.target.name()
  const el = builderStore.value.template.elements.find(e => e.id === id)
  if (el) {
    el.x = Math.round(e.target.x() / zoomLevel.value)
    el.y = Math.round(e.target.y() / zoomLevel.value)
    saveHistory()
  }
}

const handleTransformEnd = (e) => {
  const node = e.target
  const id = node.name()
  const el = builderStore.value.template.elements.find(e => e.id === id)
  if (el) {
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    node.scaleX(1)
    node.scaleY(1)

    el.x = Math.round(node.x() / zoomLevel.value)
    el.y = Math.round(node.y() / zoomLevel.value)
    
    if (el.type === 'text') {
      el.fontSize = Math.round(el.fontSize * scaleX)
      el.width = Math.round((node.width() * scaleX) / zoomLevel.value)
    } else if (el.type === 'dynamic_field') {
      el.label.fontSize = Math.round(el.label.fontSize * scaleX)
      el.value.fontSize = Math.round(el.value.fontSize * scaleX)
      el.spacing = Math.round(el.spacing * scaleX)
    } else {
      el.width = Math.round((node.width() * scaleX) / zoomLevel.value)
      el.height = Math.round((node.height() * scaleY) / zoomLevel.value)
    }
    saveHistory()
  }
}

watch(zoomLevel, () => {
  updateTransformer()
})

const autoGenerateLayout = () => {
  // Clear everything and generate a clean smart layout
  builderStore.value.template.elements = []
  selectedElementId.value = null
  updateTransformer()

  // 0. Background
  if (wizard.value.bgColors.length === 1) {
    builderStore.value.template.elements.push({
      id: `el_bg`, type: 'image', name: 'Background',
      x: 0, y: 0, width: CR80_WIDTH, height: CR80_HEIGHT,
      fill: wizard.value.bgColors[0],
      opacity: 1, hidden: false, locked: true
    });
  } else if (wizard.value.bgColors.length > 1) {
    // Generate Konva linear gradient array
    const colorStops = wizard.value.bgColors.flatMap((color, idx) => [idx / (wizard.value.bgColors.length - 1), color]);
    
    // Calculate start/end points based on angle (0 to 360)
    const angleRad = (wizard.value.bgAngle - 90) * Math.PI / 180;
    const center = { x: CR80_WIDTH / 2, y: CR80_HEIGHT / 2 };
    // Basic projection to bounding box (simplified for 0, 90, 180, 270 mostly)
    const radius = Math.max(CR80_WIDTH, CR80_HEIGHT) / 2;
    const startX = center.x + Math.cos(angleRad + Math.PI) * radius;
    const startY = center.y + Math.sin(angleRad + Math.PI) * radius;
    const endX = center.x + Math.cos(angleRad) * radius;
    const endY = center.y + Math.sin(angleRad) * radius;

    builderStore.value.template.elements.push({
      id: `el_bg`, type: 'rect_gradient', name: 'Background',
      x: 0, y: 0, width: CR80_WIDTH, height: CR80_HEIGHT,
      fillLinearGradientStartPoint: { x: startX, y: startY },
      fillLinearGradientEndPoint: { x: endX, y: endY },
      fillLinearGradientColorStops: colorStops,
      opacity: 1, hidden: false, locked: true
    });
  }

  let currentY = 40;
  
  // 1. School Name
  if (wizard.value.schoolName.trim()) {
    builderStore.value.template.elements.push({
      id: `el_school_name`,
      type: 'text',
      name: 'School Name',
      text: wizard.value.schoolName,
      x: 0, 
      y: currentY, 
      width: CR80_WIDTH,
      fontSize: 32,
      fontFamily: 'Arial',
      fill: '#1e293b',
      bold: true,
      align: 'center',
      opacity: 1, hidden: false, locked: false
    });
    currentY += 45;
  }

  // 2. Subtitle
  if (wizard.value.subtitle.trim()) {
    builderStore.value.template.elements.push({
      id: `el_subtitle`,
      type: 'text',
      name: 'Subtitle',
      text: wizard.value.subtitle,
      x: 0, 
      y: currentY, 
      width: CR80_WIDTH,
      fontSize: 16,
      fontFamily: 'Arial',
      fill: '#64748b',
      bold: false,
      align: 'center',
      opacity: 1, hidden: false, locked: false
    });
    currentY += 35;
  }

  // 3. Logo
  if (wizard.value.includeLogo) {
    builderStore.value.template.elements.push({
      id: `el_logo`,
      type: 'image',
      name: 'School Logo',
      x: 40, 
      y: 35, 
      width: 60, height: 60,
      fill: '#cbd5e1',
      rounded: true,
      opacity: 1, hidden: false, locked: false
    });
  }

  currentY += 20;

  // 4. Student Photo
  if (wizard.value.includePhoto) {
    builderStore.value.template.elements.push({
      id: `el_photo`,
      type: 'image',
      name: 'Student Photo',
      x: Math.round(CR80_WIDTH / 2) - 80, 
      y: currentY, 
      width: 160, height: 200,
      fill: '#e2e8f0',
      rounded: false,
      opacity: 1, hidden: false, locked: false
    });
    currentY += 230;
  }

  // 5. Dynamic Fields
  wizard.value.fields.forEach((field, index) => {
    builderStore.value.template.elements.push({
      id: `el_field_${index}`,
      type: 'dynamic_field',
      name: field.label,
      x: 80, 
      y: currentY,
      layout: 'horizontal',
      displayMode: 'both',
      spacing: 12,
      hidden: false, locked: false, opacity: 1,
      label: {
        text: field.label,
        fontSize: 18, fontFamily: 'Arial', fill: '#64748b', bold: true, italic: false, underline: false
      },
      value: {
        text: field.formula,
        fontSize: 18, fontFamily: 'Arial', fill: '#0f172a', bold: true, italic: false, underline: false
      }
    });
    currentY += 40; // Step down for next field
  });

  saveHistory();
}

const deleteSelected = () => {
  if (!selectedElementId.value) return
  builderStore.value.template.elements = builderStore.value.template.elements.filter(e => e.id !== selectedElementId.value)
  selectedElementId.value = null
  saveHistory()
  updateTransformer()
}

const duplicateElement = () => {
  if (!selectedElement.value) return
  const current = selectedElement.value
  const newElement = JSON.parse(JSON.stringify(current))
  newElement.id = `el_${Date.now()}`
  newElement.x += 20
  newElement.y += 20
  
  builderStore.value.template.elements.push(newElement)
  selectedElementId.value = newElement.id
  saveHistory()
  updateTransformer()
}

const moveLayerUp = (id) => {
  const elements = builderStore.value.template.elements
  const idx = elements.findIndex(e => e.id === id)
  if (idx < elements.length - 1) {
    const temp = elements[idx]
    elements[idx] = elements[idx + 1]
    elements[idx + 1] = temp
    saveHistory()
    updateTransformer()
  }
}

const moveLayerDown = (id) => {
  const elements = builderStore.value.template.elements
  const idx = elements.findIndex(e => e.id === id)
  if (idx > 0) {
    const temp = elements[idx]
    elements[idx] = elements[idx - 1]
    elements[idx - 1] = temp
    saveHistory()
    updateTransformer()
  }
}

const toggleBold = () => { if (selectedElement.value) { selectedElement.value.bold = !selectedElement.value.bold; saveHistory() } }
const toggleItalic = () => { if (selectedElement.value) { selectedElement.value.italic = !selectedElement.value.italic; saveHistory() } }
const toggleUnderline = () => { if (selectedElement.value) { selectedElement.value.underline = !selectedElement.value.underline; saveHistory() } }

const toggleDynamicBold = () => { if (activeDynamicPart.value) { activeDynamicPart.value.bold = !activeDynamicPart.value.bold; saveHistory() } }
const toggleDynamicItalic = () => { if (activeDynamicPart.value) { activeDynamicPart.value.italic = !activeDynamicPart.value.italic; saveHistory() } }
const toggleDynamicUnderline = () => { if (activeDynamicPart.value) { activeDynamicPart.value.underline = !activeDynamicPart.value.underline; saveHistory() } }

const saveTemplate = () => {
  alert('Template structure ready to save to database.')
}

const exportPdf = async () => {
  if (!stageRef.value) return
  const previousSelected = selectedElementId.value
  selectedElementId.value = null
  updateTransformer()
  await nextTick()
  try {
    const stage = stageRef.value.getNode()
    const dataUrl = stage.toDataURL({ pixelRatio: 3 })
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [53.98, 85.60] })
    pdf.addImage(dataUrl, 'PNG', 0, 0, 53.98, 85.60)
    pdf.save(`${builderStore.value.template.name || 'ID_Card'}.pdf`)
  } catch(err) {
    console.error('PDF Export failed:', err)
  } finally {
    selectedElementId.value = previousSelected
    updateTransformer()
  }
}
</script>

<style scoped>
.pattern-bg {
  background-color: #f8fafc;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.hide-arrows::-webkit-outer-spin-button,
.hide-arrows::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>

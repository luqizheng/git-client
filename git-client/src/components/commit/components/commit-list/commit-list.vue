<template>
  <div
    class="commit-list"
    tabindex="0"
    @keydown="handleKeyDown"
  >
    <CommitToolbar
      :filter-type="filterType"
      :match-count="filteredCommits.length !== displayCommits.length ? filteredCommits.length : null"
      @update:filter-type="filterType = $event"
      @search="filterText = $event"
      @show-all="onShowAll"
    />

    <ColumnHeader
      :columns="visibleColumns"
      :graph-width="graphWidth"
      @resize="resizeColumn"
    />

    <div
      ref="scrollContainer"
      class="scroll-container"
      @scroll="onScroll"
    >
      <CommitCanvas
        :nodes="graph.nodes"
        :connections="graph.connections"
        :pass-through-lanes="graph.passThroughLanes"
        :id-to-row-index="idToRowIdx"
        :max-lane="graph.maxLane"
        :total-rows="filteredCommits.length"
        :scroll-top="scrollTop"
        :viewport-height="viewportHeight"
        :selected-commit-id="selectedCommitId"
      />
      <div
        class="scroll-content"
        :style="{ height: totalHeight + 'px' }"
      >
        <template v-for="item in visibleItems" :key="item.commit.id">
          <CommitRow
            :commit="item.commit"
            :columns="visibleColumns"
            :graph-width="graphWidth"
            :graph-node="graph.nodes.get(item.commit.id)"
            :graph-connections="graph.connections"
            :max-lane="graph.maxLane"
            :pass-through-lanes="graph.passThroughLanes"
            :row-index="idToRowIdx.get(item.commit.id) ?? 0"
            :selected="item.commit.id === selectedCommitId"
            :is-hovered="item.commit.id === hoveredId"
            :is-keyboard-focused="isFocusedItem(item)"
            :offset="item.offset"
            :search-query="filterText || undefined"
            @click="handleClick(item.commit, $event)"
            @contextmenu="handleContextMenu($event, item.commit)"
            @dblclick="onDblClick(item.commit)"
            @mouseenter="setHovered(item.commit.id)"
            @mouseleave="setHovered(null)"
            @dragstart="onDrag
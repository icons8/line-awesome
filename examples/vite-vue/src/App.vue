<script setup>
import { lasStar } from 'line-awesome';
import { LaIcon } from 'line-awesome/vue';
</script>

<template>
  <p>
    <!-- Data import + renderer: works without any bundler plugin. -->
    <LaIcon :icon="lasStar" title="Star" />
    <!-- unplugin-icons + resolver: no import, no registration. -->
    <i-la-heart-solid />
    <i-la-github />
    <!-- v1 font classes keep working. -->
    <i class="las la-bell"></i>
  </p>
</template>

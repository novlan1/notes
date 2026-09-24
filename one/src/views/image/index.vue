<template>
  <div
    class="flex
    items-center
    justify-between
    border-0
    border-b-[.5px]
    border-solid
    border-b-[#d1d9e0]
    px-3
    pb-4
    pt-4
  "
  >
    <div
      class="
      cursor-pointer
      text-2xl
      font-bold
      text-[#1f2328]
      "
      @click.stop="clickHome"
    >
      ONE
    </div>
  </div>

  <ImageGrid
    :image-list="imageInfo.list"
    :should-break-word="true"
    width="300px"
    height="200px"
  />

  <div
    class="flex-end mb-[30px] mt-[70px] flex justify-end p-[20px]"
  >
    <TPagination
      v-model="imageInfo.currentPage"
      v-model:pageSize="imageInfo.pageSize"
      class=""
      :total="imageInfo.total"
      :page-size-options="[20, 40, 60, 80, 120, 200, 500, 1000]"
      @change="onChange"
      @page-size-change="onPageSizeChange"
      @current-change="onCurrentChange"
    />
  </div>
</template>
<script lang="ts" setup>
import { ref, onMounted } from 'vue';

import { ImageGrid, type ParsedImage } from 'press-tdesign-vue-next';
import { extendUrlParams } from 't-comm/es/url/extend-url-params';
import {
  Pagination as TPagination,
  type PaginationProps,
} from 'tdesign-vue-next';

import { useRouter, useRoute } from 'vue-router';

import { getOneData } from '../../logic/one/get-data';


const router = useRouter();
const route = useRoute();


const imageInfo = ref<{
  total: number;
  list: ParsedImage[];
  currentPage: number;
  pageSize: number;
}>({
  total: 0,
  list: [],
  currentPage: 1,
  pageSize: 60,
});


const updateQuery = (info: Record<string, string | number>) => {
  const newUrl = extendUrlParams(window.location.href, info, true);
  window.history.replaceState(history.state, '', newUrl);
};


const onPageSizeChange: PaginationProps['onPageSizeChange'] = () => {
  imageInfo.value.currentPage = 1;

  onGetImages();

  updateQuery({
    page: 1,
    page_size: imageInfo.value.pageSize,
  });
};

const onCurrentChange: PaginationProps['onCurrentChange'] = (index) => {
  imageInfo.value.currentPage = index;

  onGetImages();

  updateQuery({
    page: index,
  });
};

const onChange: PaginationProps['onChange'] = () => {};


onMounted(() => {
  const { page, page_size: pageSize } = route.query;
  if (page) {
    imageInfo.value.currentPage = +page;
  }
  if (pageSize) {
    imageInfo.value.pageSize = +pageSize;
  }
  onGetImages();
});


const onGetImages = (isRefresh?: boolean) => {
  if (isRefresh) {
    imageInfo.value.currentPage = 1;
  }

  const list = getOneData();
  imageInfo.value.total = list.length;
  imageInfo.value.list = list.slice(
    (imageInfo.value.currentPage - 1) * imageInfo.value.pageSize,
    imageInfo.value.currentPage * imageInfo.value.pageSize,
  );
};


const clickHome = () => {
  router.push('/');
};
</script>

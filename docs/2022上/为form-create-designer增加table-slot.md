[form-create-designer](http://www.form-create.com/designer/?fr=home)是一个表单设计器，最近研究了下如何在它上面生成table slot，就是在一个table组件中预设了slot，然后尝试通过拖拽子组件完成这个table组件。

先说下普通插槽的拖拽是如何实现的，也就是一个组件只有一个默认slot的情况。方法如下：
- rule增加一个drag:true，children: []
- 组件增加一个slot，就可以向内拖拽了。


再说下table slot，我们的table组件是基于Element的，长这样：

```html
 <el-table
  :data="tableData"
>
  <template v-for="(item, cIndex) in columnData">
    <el-table-column
      v-if="item.type == 'operation'"
      :key="item.field"
      :prop="item.field"
      :label="item.fieldName"
    >
  </el-table-column>
  <el-table-column
    v-else
    :key="item.field"
    :prop="item.field"
    :label="item.fieldName"
  >
    <template slot-scope="scope">
      <slot
        v-if="item.slotName"
        :scope="scope"
        :name="item.slotName"
      />
      <slot
        v-else-if="item.isSlot"
        :scope="scope"
        :name="`${scope.$index}-${cIndex}`"
      />
    {{ scope.row[item.field] }}
   </template>
  </el-table-column>
</el-table>
```

可以看到有两个基本的props，tableData、columnData，如果columnData的slotName存在就展示slot。

其实这里并没有必要非要给一个slotName，因为每个单元格的位置是确定的，所以这里可以简化为，指定了某一列的isSlot为true就可以，slot name自然就确定了。

```html
 <slot
  v-if="item.isSlot"
  :scope="scope"
  :name="`${scope.$index}-${cIndex}`"
/>
```

再说说拖拽的实现，一开始尝试了下在table组件内增加draggable，包裹slot，然后为其增加dragAdd、dragEnd等事件。这种方法缺点是：
1. 会增加大量table组件与父组件的值、事件的传递
2. dragTool面板上还有一些事件要处理，会增加额外工作，且不好维护
3. 不利于扩展，如果有类似需求的组件，难以复用


所以目前采用的方法是，利用rule.children生成slot类型的DragBox，[前置知识在这里](http://www.form-create.com/v2/guide/slot.html)。

要用好rule，需要知道它的数据结构，以及它在拖拽过程中是如何维护的，基本是这样：`DragBox => DragTool => 子组件`，比如：

```js
rule: [{
  type: 'DragBox',
  children: [{
    type: 'DragTool',
    children: [{
      type: 'test-comp',
      children: [{
        type: 'dragBox',
        children: [{
          type: 'DragTool',
          children: [{
            type: 'span',
          }],
        }],
      }],
    }],
  }],
}],
```

table slot有两种情况，一种是只有占位Box，还没有拖拽子组件，另一种是已经拖拽了子组件。
- 如果是第一种只有占位的情况，根据tableData和columnData生成空的DragBox就可以，注意声明DragBox的slot值。
- 如果是第二种情况，根据子组件的类型生成rule，然后为其包裹DragBox、DragTool。同样的，在最外层声明slot值。


其实也很简单，主要思路就是构造一个可渲染的slot块，过程中要尽可能地复用之前的逻辑（拖动、增加、删除、激活等）。核心逻辑如下：

```js
function makeRule(rue) {
  if (config.drag) {
    const children = [];
    if (rule.children.length) {
      const list = [];
      rule.children.map((item) => {
        if (item.type) {
          const tempRule = this.makeRule(ruleList[item.type]);
          const tempRule2 = this.makeDragRule([tempRule], item.slot);
          tempRule2[0].slot = item.slot;
          list.push(...tempRule2);
        } else {
          const tempRule = this.makeDrag(config.drag, 'draggable', [], {
            end: (inject, evt) => this.dragEnd(inject.self.children, evt),
            add: (inject, evt) => this.dragAdd(inject.self.children, evt),
            start: (inject, evt) => this.dragStart(inject.self.children, evt),
            unchoose: (inject, evt) => this.dragUnchoose(inject.self.children, evt),
          }, {
            name: 'fade',
            tag: 'div',
            isSlot: item.slot,
          });
          tempRule.slot = item.slot;
          list.push(tempRule);
        }
      });
      rule.children = list;
    } else {
      rule.children.push(drag = this.makeDrag(config.drag, rule.type, children, {
        end: (inject, evt) => this.dragEnd(inject.self.children, evt),
        add: (inject, evt) => this.dragAdd(inject.self.children, evt),
        start: (inject, evt) => this.dragStart(inject.self.children, evt),
        unchoose: (inject, evt) => this.dragUnchoose(inject.self.children, evt),
      }));
    }
  }
}
```











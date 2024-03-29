// TODO: All of this should move to contexture-export

import _ from 'lodash/fp.js'
import F from 'futil'

let Tree = F.tree(_.get('children'), (key) => ({ key }))
let setFilterOnly = Tree.transform((node) => {
  node.filterOnly = true
})
let lastChild = (x) => _.last(Tree.traverse(x))

let wrapTree = _.curry((analysisNodes, tree) => ({
  key: 'analysisRoot',
  type: 'group',
  join: 'and',
  schema: tree.schema,
  children: [setFilterOnly(tree), ..._.castArray(analysisNodes)],
}))

export let analyzeTree = _.curry(
  async (service, tree, analysisNodes, options) =>
    lastChild(await service(wrapTree(analysisNodes, tree), options))
)

export let facet = ({ service, tree, field, size = 100, sortDir, options }) => {
  let analyze = analyzeTree(service, tree)
  let getTotalRecords = _.memoize(async () => {
    let result = await analyze(
      {
        key: 'analysisOutput',
        type: 'cardinality',
        field,
      },
      options
    )
    return _.get('context.value', result)
  })

  let done = false
  let getNext = async () => {
    let result = await analyze(
      {
        key: 'analysisOutput',
        type: 'facet',
        field,
        size,
        sortDir,
      },
      options
    )
    done = true
    return _.map('name', result.context.options)
  }

  return {
    getTotalRecords,
    hasNext: () => !done,
    getNext,
  }
}

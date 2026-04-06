// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Legacy Vue (migrated from Laravel): 4-space + semicolons — tránh hàng nghìn cảnh báo stylistic
  {
    files: ['components/**/*.vue'],
    rules: {
      '@stylistic/indent': 'off',
      '@stylistic/semi': 'off',
      '@stylistic/quotes': 'off',
      '@stylistic/comma-dangle': 'off',
      '@stylistic/member-delimiter-style': 'off',
      '@stylistic/brace-style': 'off',
      'vue/html-indent': 'off',
      'vue/script-indent': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/html-closing-bracket-spacing': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/v-slot-style': 'off',
      'vue/html-self-closing': 'off',
      'vue/attributes-order': 'off',
      'vue/order-in-components': 'off',
      'vue/quote-props': 'off',
      'vue/object-curly-spacing': 'off',
      'vue/operator-linebreak': 'off',
      'vue/padding-line-between-blocks': 'off',
      'vue/padding-line-between-tags': 'off',
      '@stylistic/object-curly-spacing': 'off',
      '@stylistic/arrow-parens': 'off',
      '@stylistic/padding-line-between-statements': 'off',
      '@stylistic/quote-props': 'off',
      '@stylistic/operator-linebreak': 'off',
      '@stylistic/spaced-comment': 'off',
      '@stylistic/indent-binary-ops': 'off',
      'prefer-arrow-callback': 'off',
      'vue/no-parsing-error': 'error'
    }
  }
)

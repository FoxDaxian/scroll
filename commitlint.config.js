module.exports = {
    rules: {
        'body-leading-blank': [1, 'always'],
        'footer-leading-blank': [1, 'always'],
        'header-max-length': [2, 'always', 72],
        'scope-case': [2, 'always', 'lower-case'],
        'subject-case': [
            2,
            'never',
            []
        ],
        'subject-empty': [2, 'never'],
        'subject-full-stop': [2, 'never', '.'],
        'type-case': [2, 'always', 'lower-case'],
        'type-empty': [2, 'never'],
        'type-enum': [
            2,
            'always',
            [
                'build', // 构建工具或外部依赖的更改（npm，webpack，gulp等）
                'chore', // 脏活累活
                'ci', // 更改项目级的配置文件或脚本
                'docs', // 文档更新
                'feat', // 添加了一个新功能
                'fix', // 修复了一个 bug
                'perf', // 代码优化
                'refactor', // 重构代码且不引进新的功能或修复 bug
                'revert', // 撤销改动先前的提交
                'style', //  不影响代码运行的更改（空格，格式，缺少分号等）
                'test', // 添加或修改测试用例
				'update' // 更新了某些东西
            ]
        ]
    }
};

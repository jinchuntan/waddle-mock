# 🚀 Quick Start Guide

You've initialized a minimal Lua AI Agent. Here's how to get started:

## Step 1: Chat with Your Agent

```bash
lua chat
```

Select **Sandbox** mode. Your agent is empty but functional - try chatting!

## Step 2: Create Your First Tool

### Create the folders and files:

```bash
mkdir -p src/skills/tools
```

### Create a tool (`src/skills/tools/MyTool.ts`):

```typescript
import { LuaTool } from "lua-cli";
import { z } from "zod";

export default class MyTool implements LuaTool {
    name = "my_tool";
    description = "Does something useful";
    
    inputSchema = z.object({
        input: z.string().describe("What to process")
    });

    async execute(input: z.infer<typeof this.inputSchema>) {
        return { result: `Processed: ${input.input}` };
    }
}
```

### Create a skill (`src/skills/my.skill.ts`):

```typescript
import { LuaSkill } from "lua-cli";
import MyTool from "./tools/MyTool";

export default new LuaSkill({
    name: "my-skill",
    description: "My custom skill",
    context: "Use these tools when...",
    tools: [new MyTool()],
});
```

### Add to your agent (`src/index.ts`):

```typescript
import { LuaAgent } from "lua-cli";
import mySkill from "./skills/my.skill";

const agent = new LuaAgent({
    name: `My Agent`,
    persona: `You are a helpful assistant.`,
    skills: [mySkill],
});
```

## Step 3: Test Your Tool

```bash
lua test
```

Select your tool and provide test inputs.

## Step 4: Deploy

```bash
lua push all --force --auto-deploy
```

## 🎓 Need Examples?

Initialize a project with full examples:

```bash
mkdir my-examples && cd my-examples
lua init --with-examples
```

Or check the documentation: https://docs.heylua.ai/examples

## 📖 Commands Reference

| Command | What it does |
|---------|-------------|
| `lua test` | Test tools interactively |
| `lua chat` | Chat with your agent |
| `lua compile` | Compile your code |
| `lua push` | Upload to server |
| `lua deploy` | Deploy to production |
| `lua logs` | View logs |
| `lua env` | Manage environment variables |
| `lua persona` | Update agent persona |

## 🔗 Resources

- **Docs:** https://docs.heylua.ai
- **Examples:** https://docs.heylua.ai/examples
- **API:** https://docs.heylua.ai/api

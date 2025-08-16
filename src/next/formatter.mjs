export function formatCPP(node, indent) {
    const pad = padding(indent);
    let code = '';

    switch (node.type) {
        case 'namespace': {
            code += `${pad}namespace ${node.name} {\n`;
            for (const child of node.children) {
                code += formatCPP(child, indent + 2);
            }
            code += `${pad}}\n`;
            break;
        }
        case 'struct': {
            if (node.templates) {
                code += `${pad}template`;
                code += `<`;
                code += node.templates.map((template) => `typename ${template.name}`).join(', ');
                code += `>\n`;
            }
            code += `${pad}struct ${node.name} `;
            if (node.inherit) {
                code += `: ${node.inherit.name}`;
                if (node.inherit.templates) {
                    code += '<';
                    code += node.inherit.templates.map((template) => template.name).join(', ');
                    code += '>';
                }
                code += ' ';
            }
            code += `{\n`;
            for (const field of node.fields) {
                code += formatCPP(field, indent + 2);
            }
            code += `${pad}};\n`;
            break;
        }
        default: {
            let type = '';

            if (node.type.static)    type += 'static ';
            if (node.type.constexpr) type += 'constexpr ';
            if (node.type.const)     type += 'const ';
            if (node.type.volatile)  type += 'volatile ';

            type += node.type.name;

            if (node.type.templates) {
                type += '<';
                type += node.type.templates.map((template) => template.name).join(', ');
                type += '>';
            }

            if (node.type.ptr) type += '*';
            if (node.type.ref) type += '&';

            code += `${pad}${type} ${node.name}`;
            if (node.type.fixedArray !== undefined) code += `[0x${node.type.fixedArray.toString(16).toUpperCase()}]`;

            code += ';';

            if (node.offset !== undefined) {
                code += ` // ${node.offset.toString(16).toUpperCase()}`;
            }

            code += '\n';
            break;
        }
    }
    return code;
}

function padding(length) {
    return ' '.repeat(length);
}

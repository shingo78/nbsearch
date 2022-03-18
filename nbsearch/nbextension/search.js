define([
    'jquery',
], function(
    $,
) {
    const log_prefix = '[nbsearch]';
    const config = { url_prefix: '' };

    function init(url_prefix, target, renderers) {
        config.url_prefix = url_prefix;
        config.target = target;
        config.renderers = renderers;
    }

    function query_from_search_params(search_params) {
        const baseq = {};
        const start = search_params.get('start');
        const limit = search_params.get('limit');
        const sort = search_params.get('sort');
        if (start !== undefined && start !== null) {
            baseq.start = parseInt(start);
        }
        if (limit !== undefined && limit !== null) {
            baseq.limit = parseInt(limit);
        }
        if (sort !== undefined && sort !== null) {
            baseq.sort = sort;
        }
        const solrquery = search_params.get('solrquery');
        return Object.assign(baseq, { solrquery });
    }

    function _create_target_query_ui(target) {
        const target_text = $('<input></input>')
            .attr('id', 'nbsearch-target-text')
            .attr('size', '80')
            .attr('type', 'text');
        const target_text_c = $('<div></div>')
            .addClass('nbsearch-category-body')
            .append($('<span></span>').text('Solrクエリ:'))
            .append(target_text)
        if (target.solrquery) {
            const params = new URLSearchParams(target.solrquery);
            target_text.val(params.get('q') || '');
        }
        return $('<div></div>')
            .addClass('nbsearch-category-section')
            .append(target_text_c);
    }

    function _create_cell_field(fieldname, value, change_callback) {
        const fieldtype = $('<select></select>')
            .addClass('nbsearch-cell-field-type');
        [
          ['_text_', '全文検索'],
          ['owner', '所有者'],
          ['filename', 'ファイル名'],
          ['server', 'サーバーURL'],
          ['source', 'Cellのテキスト'],
          ['outputs', 'Cellの出力'],
          ['lc_cell_memes', 'Cell MEME'],
          ['lc_notebook_meme__current', 'Notebook MEME'],
          ['signature_notebook_path', 'Notebookパス'],
          ['source__code', 'Code Cell'],
          ['source__markdown', 'Markdown Cell'],
          ['source__markdown__operation_note', 'Operation Note'],
          ['source__markdown__todo', 'Markdown Cell中の`TODO`'],
          ['source__markdown__heading', 'Markdown Cell中の見出し'],
          ['source__markdown__url', 'Markdown Cell中のURL'],
          ['source__markdown__code', 'Markdown Cell中のコード'],
          ['outputs__stdout', 'Cellの標準出力'],
          ['outputs__stderr', 'Cellの標準エラー出力'],
          ['outputs__result_plain', 'Cellの結果出力'],
          ['outputs__result_html', 'Cellの結果HTML出力'],
        ].forEach(v => {
            fieldtype.append($('<option></option>').attr('value', v[0]).text(v[1]));
        });
        fieldtype.val(fieldname);
        fieldtype.change(change_callback)
        const fieldvalue = $('<input></input>')
            .attr('type', 'text')
            .addClass('nbsearch-cell-field-value');
        fieldvalue.val(value);
        fieldvalue.change(change_callback)
        const container = $('<span></span>');
        return container
            .addClass('nbsearch-cell-field')
            .append(fieldtype)
            .append(fieldvalue);
    }

    function _create_cell_element_query_ui(fieldname, value, change_callback) {
        const container = $('<div></div>')
            .addClass('nbsearch-cell-container');
        const fields = $('<span></span>');
        fields.append(_create_cell_field(fieldname, value, change_callback));
        const remove_button = $('<button></button>')
            .addClass('btn btn-default btn-xs')
            .append($('<i></i>').addClass('fa fa-trash'));
        remove_button.click(() => {
            container.remove();
        });
        return container.append(fields).append(remove_button);
    }

    function _create_notebook_query_ui(cell, change_callback) {
        const cell_cond = $('<select></select>')
            .attr('id', 'nbsearch-cell-cond')
            .append($('<option></option>').attr('value', 'AND').text('すべて成立'))
            .append($('<option></option>').attr('value', 'OR').text('いずれか成立'));
        let conds = (cell.conds || []).map(element => element);
        if (cell && cell.q_op) {
            cell_cond.val(cell.q_op);
        }
        if (conds.length == 0) {
            conds.push({
                name: '_text_',
                value: '*',
            });
        }
        const cell_cond_c = $('<div></div>')
            .addClass('nbsearch-category-body')
            .append($('<span></span>').text('以下の条件が'))
            .append(cell_cond);

        const cell_conds = $('<div></div>')
            .addClass('nbsearch-category-body');
        conds.forEach(field => {
            cell_conds.append(_create_cell_element_query_ui(field.name, field.value, change_callback));
        });
        const cell_add_button = $('<button></button>')
            .addClass('btn btn-default btn-xs')
            .append($('<i></i>').addClass('fa fa-plus'))
            .append('条件を追加');
        cell_add_button.click(() => {
            cell_conds.append(_create_cell_element_query_ui('_text_', '*', change_callback));
        });
        const cell_conds_add = $('<div></div>')
            .addClass('nbsearch-category-body')
            .append(cell_add_button);
        return $('<div></div>')
            .addClass('nbsearch-category-section')
            .append(cell_cond_c)
            .append(cell_conds)
            .append(cell_conds_add);
    }

    function _create_base_query_ui(query_editor, query) {
        const solr_query = _create_target_query_ui(query || {});

        const tabs = $('<div></div>').addClass('nbsearch-query-tabs');
        const solr_query_button = $('<a></a>').text('Solrクエリ');
        const query_editor_button = $('<a></a>').text('検索');
        const solr_query_tab = $('<div></div>').append(solr_query_button);
        const query_editor_tab = $('<div></div>').append(query_editor_button);
        tabs.append(query_editor_tab);
        tabs.append(solr_query_tab);
        tabs.append($('<div></div>').css('flex-grow', '1').addClass('nbsearch-query-tab-inactive'));
        if (query.solrquery) {
            solr_query_tab.addClass('nbsearch-query-tab-active');
            query_editor_tab.addClass('nbsearch-query-tab-inactive');
            solr_query.show();
            query_editor.hide();
        } else {
            solr_query_tab.addClass('nbsearch-query-tab-inactive');
            query_editor_tab.addClass('nbsearch-query-tab-active');
            solr_query.hide();
            query_editor.show();
        }

        solr_query_button.click(() => {
            solr_query.show();
            query_editor.hide();
            solr_query_tab.removeClass('nbsearch-query-tab-inactive').addClass('nbsearch-query-tab-active');
            query_editor_tab.removeClass('nbsearch-query-tab-active').addClass('nbsearch-query-tab-inactive');
        });
        query_editor_button.click(() => {
            solr_query.hide();
            query_editor.show();
            solr_query_tab.removeClass('nbsearch-query-tab-active').addClass('nbsearch-query-tab-inactive');
            query_editor_tab.removeClass('nbsearch-query-tab-inactive').addClass('nbsearch-query-tab-active');
        });

        const container = $('<div></div>');
        container.append(solr_query);
        container.append(query_editor);

        return $('<div></div>')
            .append(tabs)
            .append(container);
    }

    function create_notebook_query_ui(query) {
        const query_preview = $('<span></span>')
            .attr('id', 'nbsearch-query-preview');
        const query_editor = _create_notebook_query_ui(query || {}, () => {
            query = _get_cell_query();
            query_preview.text(query);
        });
        query_editor
            .append($('<div></div>')
                .attr('id', 'nbsearch-query-preview-container')
                .addClass('nbsearch-category-body')
                .append($('<span></span>').text('Solrクエリ:'))
                .append(query_preview)
                .hide());
        return _create_base_query_ui(query_editor, query)
    }

    function _get_cell_queries(search_context) {
        const queries = [];
        if (search_context.lc_cell_meme__current) {
            queries.push({
                name: 'Search by MEME',
                query: `cell_type:${search_context.cell_type} AND lc_cell_meme__current:${search_context.lc_cell_meme__current}`,
            });
        }
        if (search_context.lc_cell_meme__previous) {
            queries.push({
                name: 'Search by previous MEME',
                query: `cell_type:${search_context.cell_type} AND lc_cell_meme__previous:${search_context.lc_cell_meme__previous}`,
            });
        }
        if (search_context.source) {
            const source = search_context.source.replaceAll('\n', ' ');
            queries.push({
                name: 'Search by content',
                query: `cell_type:${search_context.cell_type} AND source__${search_context.cell_type}:${source}`,
            });
        }
        queries.push({
            name: `All ${search_context.cell_type} cells`,
            query: `cell_type:${search_context.cell_type}`,
        });
        return queries;
    }

    function create_cell_query_ui(search_context, query) {
        const query_preview = $('<span></span>')
            .attr('id', 'nbsearch-query-preview');
        const query_editor = $('<select></select>').attr('id', 'nbsearch-cell-query');
        _get_cell_queries(search_context).forEach(function(option) {
            query_editor.append($('<option></option>').attr('value', option.query).text(option.name));
        });
        query_editor.change(function() {
            query = _get_cell_query();
            query_preview.text(query);
        });
        query_editor_container = $('<div></div>')
            .append(query_editor)
            .append($('<div></div>')
                .attr('id', 'nbsearch-query-preview-container')
                .addClass('nbsearch-category-body')
                .append($('<span></span>').text('Solrクエリ:'))
                .append(query_preview)
                .hide());
        return _create_base_query_ui(query_editor_container, query)
    }

    function _get_notebook_query() {
        const cond = $('#nbsearch-cell-cond').val();
        const cond_elems = [];
        $('.nbsearch-cell-field').toArray().forEach(field => {
            const k = $(field).find('.nbsearch-cell-field-type').val();
            const v = $(field).find('.nbsearch-cell-field-value').val();
            cond_elems.push(`${k}:${v}`);
        });
        return cond_elems.join(` ${cond} `);
    }

    function _get_cell_query() {
        return $('#nbsearch-cell-query').val();
    }

    function get_notebook_query(start, limit, sort) {
        let query = $('#nbsearch-target-text').val();
        if ($('#nbsearch-cell-cond').is(':visible')) {
            query = _get_notebook_query();
            $('#nbsearch-query-preview').text(query);
            $('#nbsearch-query-preview-container').show();
            $('#nbsearch-target-text').val(query);
        }
        r = {
            query,
        };
        if (start !== undefined) {
            r.start = start.toString();
        }
        if (limit !== undefined) {
            r.limit = limit.toString();
        }
        if (sort !== undefined) {
            r.sort = sort;
        }
        return r;
    }

    function get_cell_query(start, limit, sort) {
        let query = $('#nbsearch-target-text').val();
        if ($('#nbsearch-cell-query').is(':visible')) {
            query = _get_cell_query();
            $('#nbsearch-query-preview').text(query);
            $('#nbsearch-query-preview-container').show();
            $('#nbsearch-target-text').val(query);
        }
        r = {
            query,
            q_op: 'OR',
        };
        if (start !== undefined) {
            r.start = start.toString();
        }
        if (limit !== undefined) {
            r.limit = limit.toString();
        }
        if (sort !== undefined) {
            r.sort = sort;
        }
        return r;
    }

    function execute(query_) {
        const query = Object.assign({}, query_);
        console.log(log_prefix, 'QUERY', query);
        return new Promise((resolve, reject) => {
            if (config.renderers && config.renderers.render_loading) {
                config.renderers.render_loading();
            }
            var jqxhr = $.getJSON(`${config.url_prefix}/v1/${config.target}/search?${$.param(query)}`)
                .done(data => {
                    console.log(log_prefix, 'query', data.solrquery);
                    if (config.renderers && config.renderers.render_results) {
                        config.renderers.render_results(data);
                    }
                    resolve(data);
                })
                .fail(err => {
                    console.error(log_prefix, 'error', err);
                    if (config.renderers && config.renderers.render_error) {
                        config.renderers.render_error(err);
                    }
                    reject(err);
                });
        });
    }

    return {
        init,
        execute,
        create_notebook_query_ui,
        create_cell_query_ui,
        get_notebook_query,
        get_cell_query,
        query_from_search_params,
    };
});

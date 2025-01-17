import os

from tornado import gen
import tornado.web

from .db import NBSearchDB
from .handlers import (MainHandler)
from .v1.handlers import (
    NBSEARCH_TMP,
    SearchHandler,
    ImportHandler,
)


DEFAULT_STATIC_FILES_PATH = os.path.join(os.path.dirname(__file__), "static")
DEFAULT_TEMPLATE_PATH_LIST = [
    os.path.dirname(__file__),
    os.path.join(os.path.dirname(__file__), 'templates'),
]


def get_api_handlers(parent_app, base_dir):
    db = NBSearchDB(parent=parent_app)

    handler_settings = {}
    handler_settings['db'] = db
    handler_settings['base_dir'] = base_dir

    return [
        (r"/v1/(?P<target>[^\/]+)/search", SearchHandler, handler_settings),
        (r"/v1/import(?P<path>/.+)?/(?P<id>[^\/]+)", ImportHandler, handler_settings),
    ]


def register_routes(nb_server_app, web_app):
    from notebook.utils import url_path_join
    api_handlers = get_api_handlers(nb_server_app, nb_server_app.notebook_dir)

    nbsearchignore = os.path.join(nb_server_app.notebook_dir, '.nbsearchignore')
    if not os.path.exists(nbsearchignore):
        with open(nbsearchignore, 'w') as f:
            f.write(f'''# Generated by nbsearch
{NBSEARCH_TMP}/**
''')

    host_pattern = '.*$'
    handlers = [(url_path_join(web_app.settings['base_url'], 'nbsearch', path),
                 handler,
                 options)
                for path, handler, options in api_handlers]
    web_app.add_handlers(host_pattern, handlers)


class ServerApp(tornado.web.Application):

    def __init__(self, nbsearch_app):
        settings = {}
        settings['static_path'] = DEFAULT_STATIC_FILES_PATH
        settings['template_path'] = DEFAULT_TEMPLATE_PATH_LIST[-1]

        handlers = get_api_handlers(nbsearch_app, '.') + [
            (r"/", MainHandler),
            (r"/static/(.*)", tornado.web.StaticFileHandler)
        ]

        super(ServerApp, self).__init__(handlers, **settings)
